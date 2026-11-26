package runtime

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"zev-go/modules/agent/engine/guardrail"
	"zev-go/modules/agent/engine/provider"
	"zev-go/modules/agent/engine/tool"
	"zev-go/pkg/logger"
)

// ApprovalRequestInfo 触发人工审批时回调给业务层创建审批单与发通知的元数据
type ApprovalRequestInfo struct {
	RunID        uint
	ToolName     string
	SanitizedArg string
	RiskLevel    string
	Reason       string
}

// RunConfig 描述单次 Agent ReAct 执行循环的完整依赖与配额预算
type RunConfig struct {
	RunID              uint
	Model              string
	SystemPrompt       string
	History            []provider.Message
	UserInput          string
	Temperature        float64
	MaxSteps           int
	MaxTokensBudget    int
	MaxContextMsgs     int
	ToolWhitelist      []string
	ApprovalTimeout    time.Duration
	Client             provider.Client
	Tools              *tool.Registry
	Guardrail          *guardrail.Engine
	Broker             *ApprovalBroker
	OnEvent            func(Event)
	OnSpan             func(SpanRecord)
	OnRequestApproval  func(ctx context.Context, info ApprovalRequestInfo) (approvalID uint, payload any, err error)
	OnApprovalFinished func(approvalID uint, status string)
}

// RunResult 汇总一次完整 Run 执行的最终产物、消息轨迹与统计指标
type RunResult struct {
	Status           string
	FinalOutput      string
	Messages         []provider.Message
	StepCount        int
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	DurationMs       int64
	ErrorMessage     string
}

// Execute 运行标准 ReAct / Tool-Use 循环，内置步数/Token 熔断、护栏、全链路 Span 与高危审批挂起
func Execute(ctx context.Context, cfg RunConfig) *RunResult {
	started := time.Now()
	if cfg.MaxSteps <= 0 {
		cfg.MaxSteps = 8
	}
	if cfg.MaxTokensBudget <= 0 {
		cfg.MaxTokensBudget = 16384
	}
	if cfg.MaxContextMsgs <= 0 {
		cfg.MaxContextMsgs = 24
	}
	if cfg.Guardrail == nil {
		cfg.Guardrail = guardrail.NewEngine(guardrail.DefaultPolicy())
	}

	emit := func(evt Event) {
		evt.RunID = cfg.RunID
		evt.Timestamp = time.Now()
		if cfg.OnEvent != nil {
			cfg.OnEvent(evt)
		}
	}
	recordSpan := func(sp SpanRecord) {
		if cfg.OnSpan != nil {
			cfg.OnSpan(sp)
		}
	}

	result := &RunResult{Status: "running"}
	emit(Event{Type: EventRunStarted, Status: "running"})

	// 1. 输入护栏检查与脱敏
	gStart := time.Now()
	inCheck := cfg.Guardrail.CheckInput(cfg.UserInput)
	gEnd := time.Now()
	gStatus := "ok"
	if !inCheck.Allowed {
		gStatus = "blocked"
	}
	recordSpan(SpanRecord{
		SpanType:     "guardrail",
		Name:         "guardrail.input",
		Status:       gStatus,
		InputJSON:    mustJSON(map[string]any{"input": logger.TruncateString(inCheck.Sanitized, 512)}),
		OutputJSON:   mustJSON(inCheck),
		StartedAt:    gStart,
		EndedAt:      gEnd,
		DurationMs:   gEnd.Sub(gStart).Milliseconds(),
		ErrorMessage: inCheck.Reason,
	})
	if !inCheck.Allowed {
		emit(Event{Type: EventGuardrail, Status: "blocked", Reason: inCheck.Reason})
		return failResult(result, started, inCheck.Reason, emit)
	}
	if inCheck.Modified {
		emit(Event{Type: EventGuardrail, Status: "sanitized", Reason: "输入中的敏感凭据已自动脱敏"})
	}

	// 2. 构建初始对话上下文并裁剪超长历史
	messages := make([]provider.Message, 0, len(cfg.History)+2)
	if strings.TrimSpace(cfg.SystemPrompt) != "" {
		messages = append(messages, provider.Message{Role: "system", Content: cfg.SystemPrompt})
	}
	messages = append(messages, cfg.History...)
	messages = append(messages, provider.Message{Role: "user", Content: inCheck.Sanitized})

	var modelTools []provider.ToolDef
	if cfg.Tools != nil {
		modelTools = cfg.Tools.FilterForModel(cfg.ToolWhitelist)
	}

	// 3. ReAct 推理与工具调用主循环
	for step := 1; step <= cfg.MaxSteps; step++ {
		if ctx.Err() != nil {
			result.Status = "cancelled"
			result.ErrorMessage = "执行已被用户取消"
			result.DurationMs = time.Since(started).Milliseconds()
			result.Messages = messages
			emit(Event{Type: EventError, Status: "cancelled", Reason: result.ErrorMessage})
			return result
		}
		if result.TotalTokens >= cfg.MaxTokensBudget {
			reason := fmt.Sprintf("已达到单次执行 Token 预算上限 (%d / %d)，触发自动熔断", result.TotalTokens, cfg.MaxTokensBudget)
			return failResult(result, started, reason, emit)
		}

		result.StepCount = step
		emit(Event{Type: EventStepStarted, Step: step})

		pruned := pruneMessages(messages, cfg.MaxContextMsgs)
		llmStart := time.Now()
		resp, err := cfg.Client.ChatStream(ctx, provider.ChatRequest{
			Model:       cfg.Model,
			Messages:    pruned,
			Tools:       modelTools,
			Temperature: cfg.Temperature,
		}, func(chunk provider.StreamChunk) error {
			if chunk.DeltaReasoning != "" {
				emit(Event{Type: EventReasoning, Step: step, Content: chunk.DeltaReasoning})
			}
			if chunk.DeltaContent != "" {
				emit(Event{Type: EventToken, Step: step, Content: chunk.DeltaContent})
			}
			return nil
		})
		llmEnd := time.Now()
		if err != nil {
			recordSpan(SpanRecord{
				SpanType:     "llm",
				Name:         fmt.Sprintf("llm.step_%d", step),
				Status:       "error",
				InputJSON:    mustJSON(map[string]any{"model": cfg.Model, "message_count": len(pruned)}),
				StartedAt:    llmStart,
				EndedAt:      llmEnd,
				DurationMs:   llmEnd.Sub(llmStart).Milliseconds(),
				ErrorMessage: err.Error(),
			})
			if errors.Is(err, context.Canceled) {
				result.Status = "cancelled"
				result.ErrorMessage = "执行已被取消"
				result.DurationMs = time.Since(started).Milliseconds()
				result.Messages = messages
				return result
			}
			return failResult(result, started, "模型调用失败: "+err.Error(), emit)
		}

		result.PromptTokens += resp.Usage.PromptTokens
		result.CompletionTokens += resp.Usage.CompletionTokens
		result.TotalTokens += resp.Usage.TotalTokens

		recordSpan(SpanRecord{
			SpanType:   "llm",
			Name:       fmt.Sprintf("llm.step_%d", step),
			Status:     "ok",
			InputJSON:  mustJSON(map[string]any{"model": cfg.Model, "message_count": len(pruned)}),
			OutputJSON: mustJSON(map[string]any{"content": logger.TruncateString(guardrail.SanitizeText(resp.Content), 1024), "tool_calls": len(resp.ToolCalls)}),
			Tokens:     resp.Usage.TotalTokens,
			StartedAt:  llmStart,
			EndedAt:    llmEnd,
			DurationMs: llmEnd.Sub(llmStart).Milliseconds(),
		})

		messages = append(messages, provider.Message{
			Role:      "assistant",
			Content:   resp.Content,
			ToolCalls: resp.ToolCalls,
		})

		// 若本轮无工具调用，经过输出护栏脱敏后结束执行
		if len(resp.ToolCalls) == 0 {
			outStart := time.Now()
			outCheck := cfg.Guardrail.CheckOutput(resp.Content)
			outEnd := time.Now()
			recordSpan(SpanRecord{
				SpanType:   "guardrail",
				Name:       "guardrail.output",
				Status:     "ok",
				OutputJSON: mustJSON(map[string]any{"modified": outCheck.Modified}),
				StartedAt:  outStart,
				EndedAt:    outEnd,
				DurationMs: outEnd.Sub(outStart).Milliseconds(),
			})
			result.Status = "completed"
			result.FinalOutput = outCheck.Sanitized
			result.Messages = messages
			result.DurationMs = time.Since(started).Milliseconds()
			emit(Event{
				Type:     EventCompleted,
				Status:   "completed",
				Content:  outCheck.Sanitized,
				Usage:    provider.Usage{PromptTokens: result.PromptTokens, CompletionTokens: result.CompletionTokens, TotalTokens: result.TotalTokens},
				Duration: result.DurationMs,
			})
			return result
		}

		// 4. 依次执行本轮模型发起的 Tool Calls（经护栏校验 + 可选人工审批挂起）
		for _, tc := range resp.ToolCalls {
			emit(Event{
				Type:      EventToolCall,
				Step:      step,
				ToolName:  tc.Name,
				ToolCall:  tc.ID,
				Arguments: logger.SanitizeJSON([]byte(tc.Arguments), 2048),
			})

			toolOutput := executeSingleTool(ctx, cfg, step, tc, emit, recordSpan)
			messages = append(messages, provider.Message{
				Role:       "tool",
				Content:    toolOutput,
				ToolCallID: tc.ID,
				ToolName:   tc.Name,
			})
			emit(Event{
				Type:     EventToolResult,
				Step:     step,
				ToolName: tc.Name,
				ToolCall: tc.ID,
				Result:   logger.TruncateString(toolOutput, 2048),
			})
		}
	}

	return failResult(result, started, fmt.Sprintf("超过最大推理步数上限 (%d 步)，触发步数熔断", cfg.MaxSteps), emit)
}

func executeSingleTool(
	ctx context.Context,
	cfg RunConfig,
	step int,
	tc provider.ToolCall,
	emit func(Event),
	recordSpan func(SpanRecord),
) string {
	if cfg.Tools == nil {
		return "错误：当前 Agent 未挂载任何可用工具。"
	}
	targetTool, ok := cfg.Tools.Get(tc.Name)
	if !ok {
		return fmt.Sprintf("错误：工具 %s 不存在或当前用户缺少对应 RBAC 权限。", tc.Name)
	}

	meta := targetTool.Meta()
	tCheck := cfg.Guardrail.CheckToolCall(tc.Name, tc.Arguments, meta.RiskLevel, cfg.ToolWhitelist)
	if !tCheck.Allowed {
		now := time.Now()
		recordSpan(SpanRecord{
			SpanType:     "guardrail",
			Name:         "guardrail.tool." + tc.Name,
			Status:       "blocked",
			InputJSON:    tCheck.SanitizedArgs,
			StartedAt:    now,
			EndedAt:      now,
			ErrorMessage: tCheck.Reason,
		})
		emit(Event{Type: EventGuardrail, Step: step, ToolName: tc.Name, Status: "blocked", Reason: tCheck.Reason})
		return "工具调用被安全护栏拦截：" + tCheck.Reason
	}

	// 高危工具触发 Human-in-the-Loop 挂起审批
	if tCheck.RequireApproval {
		appStart := time.Now()
		if cfg.Broker == nil || cfg.OnRequestApproval == nil {
			now := time.Now()
			recordSpan(SpanRecord{
				SpanType:     "approval",
				Name:         "approval." + tc.Name,
				Status:       "blocked",
				InputJSON:    tCheck.SanitizedArgs,
				StartedAt:    appStart,
				EndedAt:      now,
				ErrorMessage: "未配置人工审批通道",
			})
			return "高危工具需要人工审批，但当前执行模式（如离线评测）不支持挂起审批。"
		}

		approvalID, payload, err := cfg.OnRequestApproval(ctx, ApprovalRequestInfo{
			RunID:        cfg.RunID,
			ToolName:     tc.Name,
			SanitizedArg: tCheck.SanitizedArgs,
			RiskLevel:    tCheck.RiskLevel,
			Reason:       tCheck.Reason,
		})
		if err != nil {
			appEnd := time.Now()
			recordSpan(SpanRecord{
				SpanType:     "approval",
				Name:         "approval." + tc.Name,
				Status:       "error",
				InputJSON:    tCheck.SanitizedArgs,
				StartedAt:    appStart,
				EndedAt:      appEnd,
				DurationMs:   appEnd.Sub(appStart).Milliseconds(),
				ErrorMessage: err.Error(),
			})
			return "发起人工审批失败：" + err.Error()
		}

		emit(Event{
			Type:       EventApprovalRequired,
			Step:       step,
			ToolName:   tc.Name,
			ToolCall:   tc.ID,
			Arguments:  tCheck.SanitizedArgs,
			Reason:     tCheck.Reason,
			ApprovalID: approvalID,
			Approval:   payload,
		})

		decision, waitErr := cfg.Broker.Wait(ctx, approvalID, cfg.ApprovalTimeout)
		appEnd := time.Now()
		if waitErr != nil {
			waitStatus := "expired"
			if errors.Is(waitErr, context.Canceled) || ctx.Err() != nil {
				waitStatus = "cancelled"
			}
			if cfg.OnApprovalFinished != nil {
				cfg.OnApprovalFinished(approvalID, waitStatus)
			}
			recordSpan(SpanRecord{
				SpanType:     "approval",
				Name:         "approval." + tc.Name,
				Status:       "error",
				InputJSON:    tCheck.SanitizedArgs,
				StartedAt:    appStart,
				EndedAt:      appEnd,
				DurationMs:   appEnd.Sub(appStart).Milliseconds(),
				ErrorMessage: waitErr.Error(),
			})
			emit(Event{Type: EventApprovalResolved, Step: step, ToolName: tc.Name, ToolCall: tc.ID, ApprovalID: approvalID, Status: waitStatus, Reason: waitErr.Error()})
			return "审批未完成：" + waitErr.Error()
		}

		if !decision.Approved {
			if cfg.OnApprovalFinished != nil {
				cfg.OnApprovalFinished(approvalID, "rejected")
			}
			reason := decision.Comment
			if strings.TrimSpace(reason) == "" {
				reason = "管理员拒绝了该高危操作"
			}
			recordSpan(SpanRecord{
				SpanType:     "approval",
				Name:         "approval." + tc.Name,
				Status:       "blocked",
				InputJSON:    tCheck.SanitizedArgs,
				OutputJSON:   mustJSON(decision),
				StartedAt:    appStart,
				EndedAt:      appEnd,
				DurationMs:   appEnd.Sub(appStart).Milliseconds(),
				ErrorMessage: reason,
			})
			emit(Event{Type: EventApprovalResolved, Step: step, ToolName: tc.Name, ToolCall: tc.ID, ApprovalID: approvalID, Status: "rejected", Reason: reason})
			return fmt.Sprintf("高危工具 %s 审批被拒绝（审批人：%s，意见：%s）。请勿继续尝试该操作，向用户说明情况。", tc.Name, decision.Approver, reason)
		}

		if cfg.OnApprovalFinished != nil {
			cfg.OnApprovalFinished(approvalID, "approved")
		}
		recordSpan(SpanRecord{
			SpanType:   "approval",
			Name:       "approval." + tc.Name,
			Status:     "ok",
			InputJSON:  tCheck.SanitizedArgs,
			OutputJSON: mustJSON(decision),
			StartedAt:  appStart,
			EndedAt:    appEnd,
			DurationMs: appEnd.Sub(appStart).Milliseconds(),
		})
		emit(Event{Type: EventApprovalResolved, Step: step, ToolName: tc.Name, ToolCall: tc.ID, ApprovalID: approvalID, Status: "approved", Reason: decision.Comment})
	}

	toolStart := time.Now()
	out, execErr := targetTool.Execute(ctx, tc.Arguments)
	toolEnd := time.Now()
	sanitizedOut := logger.TruncateString(guardrail.SanitizeText(out), 8192)
	if execErr != nil {
		recordSpan(SpanRecord{
			SpanType:     "tool",
			Name:         "tool." + tc.Name,
			Status:       "error",
			InputJSON:    tCheck.SanitizedArgs,
			OutputJSON:   sanitizedOut,
			StartedAt:    toolStart,
			EndedAt:      toolEnd,
			DurationMs:   toolEnd.Sub(toolStart).Milliseconds(),
			ErrorMessage: execErr.Error(),
		})
		return fmt.Sprintf("工具 %s 执行失败: %s", tc.Name, execErr.Error())
	}

	recordSpan(SpanRecord{
		SpanType:   "tool",
		Name:       "tool." + tc.Name,
		Status:     "ok",
		InputJSON:  tCheck.SanitizedArgs,
		OutputJSON: sanitizedOut,
		StartedAt:  toolStart,
		EndedAt:    toolEnd,
		DurationMs: toolEnd.Sub(toolStart).Milliseconds(),
	})
	return sanitizedOut
}

// pruneMessages 保留首条 system prompt 与最近窗口消息，避免上下文无限膨胀
func pruneMessages(msgs []provider.Message, maxMsgs int) []provider.Message {
	if len(msgs) <= maxMsgs {
		return msgs
	}
	if len(msgs) > 0 && msgs[0].Role == "system" {
		tail := msgs[len(msgs)-(maxMsgs-1):]
		out := make([]provider.Message, 0, maxMsgs)
		out = append(out, msgs[0])
		out = append(out, tail...)
		return out
	}
	return msgs[len(msgs)-maxMsgs:]
}

func failResult(res *RunResult, started time.Time, msg string, emit func(Event)) *RunResult {
	res.Status = "failed"
	res.ErrorMessage = msg
	res.DurationMs = time.Since(started).Milliseconds()
	emit(Event{Type: EventError, Status: "failed", Reason: msg, Duration: res.DurationMs})
	return res
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}
