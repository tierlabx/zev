package tool

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"zev-go/modules/agent/engine/guardrail"
)

// MCPServerConfig 描述一个外部 MCP (Model Context Protocol) JSON-RPC HTTP 服务端配置
type MCPServerConfig struct {
	Name      string            `json:"name"`
	URL       string            `json:"url"`
	Headers   map[string]string `json:"headers,omitempty"`
	RiskLevel string            `json:"risk_level,omitempty"`
	Enabled   bool              `json:"enabled"`
}

// MCPClient 实现标准 MCP JSON-RPC 2.0 over HTTP（支持 initialize 握手、Mcp-Session-Id 与 Streamable SSE）
type MCPClient struct {
	cfg         MCPServerConfig
	httpClient  *http.Client
	mu          sync.Mutex
	sessionID   string
	initialized bool
	reqSeq      atomic.Int64
}

// DefaultAllowPrivateMCP 判断当前环境是否允许连接内网/回环 MCP 服务（开发模式默认允许，生产需显式配置 AGENT_ALLOW_PRIVATE_MCP=true）
func DefaultAllowPrivateMCP() bool {
	if strings.EqualFold(os.Getenv("AGENT_ALLOW_PRIVATE_MCP"), "true") {
		return true
	}
	return !strings.EqualFold(os.Getenv("GIN_MODE"), "release")
}

// ValidateEndpointURL 对外部服务地址执行协议与 SSRF 静态校验
func ValidateEndpointURL(rawURL string, allowPrivate bool) error {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return errors.New("服务地址不能为空")
	}
	u, err := url.Parse(trimmed)
	if err != nil {
		return fmt.Errorf("服务地址格式非法: %w", err)
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("仅支持 http/https 协议，当前为 %q", u.Scheme)
	}
	host := strings.ToLower(strings.TrimSpace(u.Hostname()))
	if host == "" {
		return errors.New("服务地址缺少主机名")
	}
	if host == "metadata.google.internal" || host == "metadata.goog" || strings.HasSuffix(host, ".internal") && host == "169.254.169.254" {
		return errors.New("禁止访问云元数据服务地址")
	}
	if ip := net.ParseIP(host); ip != nil {
		if reason := checkBlockedIP(ip, allowPrivate); reason != "" {
			return errors.New(reason)
		}
	} else if !allowPrivate && (host == "localhost" || strings.HasSuffix(host, ".localhost")) {
		return errors.New("生产环境禁止连接本地回环地址")
	}
	return nil
}

func checkBlockedIP(ip net.IP, allowPrivate bool) string {
	if ip == nil {
		return "无效的 IP 地址"
	}
	// 云元数据 (169.254.0.0/16)、链路本地、未指定与多播地址始终禁止
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast() {
		return fmt.Sprintf("禁止访问受限链路或元数据地址 (%s)", ip.String())
	}
	if !allowPrivate && (ip.IsLoopback() || ip.IsPrivate()) {
		return fmt.Sprintf("生产环境禁止访问内网或回环地址 (%s)", ip.String())
	}
	return ""
}

func newSafeHTTPClient(timeout time.Duration, allowPrivate bool) *http.Client {
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
			if err != nil {
				return nil, err
			}
			if len(ips) == 0 {
				return nil, fmt.Errorf("无法解析主机 %s", host)
			}
			var targetIP string
			for _, ipAddr := range ips {
				if reason := checkBlockedIP(ipAddr.IP, allowPrivate); reason != "" {
					return nil, errors.New(reason)
				}
				if targetIP == "" {
					targetIP = ipAddr.IP.String()
				}
			}
			return dialer.DialContext(ctx, network, net.JoinHostPort(targetIP, port))
		},
	}
	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}
}

func NewMCPClient(cfg MCPServerConfig) *MCPClient {
	return NewMCPClientWithHTTPClient(cfg, newSafeHTTPClient(20*time.Second, DefaultAllowPrivateMCP()))
}

// NewMCPClientWithHTTPClient 允许测试或自定义传输层注入 HTTP 客户端
func NewMCPClientWithHTTPClient(cfg MCPServerConfig, hc *http.Client) *MCPClient {
	if hc == nil {
		hc = newSafeHTTPClient(20*time.Second, DefaultAllowPrivateMCP())
	}
	return &MCPClient{
		cfg:        cfg,
		httpClient: hc,
	}
}

type jsonRPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int64  `json:"id,omitempty"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitempty"`
}

type jsonRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func (c *MCPClient) callRPC(ctx context.Context, method string, params any, isNotification bool) (json.RawMessage, error) {
	if err := ValidateEndpointURL(c.cfg.URL, DefaultAllowPrivateMCP()); err != nil {
		return nil, err
	}

	reqBody := jsonRPCRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
	}
	if !isNotification {
		reqBody.ID = c.reqSeq.Add(1)
	}
	raw, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimSpace(c.cfg.URL), bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	c.mu.Lock()
	sid := c.sessionID
	c.mu.Unlock()
	if sid != "" {
		req.Header.Set("Mcp-Session-Id", sid)
	}
	for k, v := range c.cfg.Headers {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if newSID := strings.TrimSpace(resp.Header.Get("Mcp-Session-Id")); newSID != "" {
		c.mu.Lock()
		c.sessionID = newSID
		c.mu.Unlock()
	}

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("MCP 服务端返回 HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	if isNotification || resp.StatusCode == http.StatusAccepted || resp.StatusCode == http.StatusNoContent {
		return nil, nil
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	var rpcResp jsonRPCResponse
	if strings.Contains(contentType, "text/event-stream") {
		parsed, err := parseSSERPCResponse(resp.Body, reqBody.ID)
		if err != nil {
			return nil, err
		}
		rpcResp = parsed
	} else {
		if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
			return nil, err
		}
	}

	if rpcResp.Error != nil {
		return nil, fmt.Errorf("MCP 错误 (%d): %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}
	return rpcResp.Result, nil
}

// parseSSERPCResponse 从 MCP Streamable HTTP (text/event-stream) 响应中提取匹配的 JSON-RPC 应答
func parseSSERPCResponse(r io.Reader, targetID int64) (jsonRPCResponse, error) {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 16*1024), 2*1024*1024)

	var firstValid *jsonRPCResponse
	var dataBuf strings.Builder
	flush := func() (*jsonRPCResponse, bool) {
		raw := strings.TrimSpace(dataBuf.String())
		dataBuf.Reset()
		if raw == "" || raw == "[DONE]" {
			return nil, false
		}
		var item jsonRPCResponse
		if err := json.Unmarshal([]byte(raw), &item); err != nil {
			return nil, false
		}
		if item.ID == targetID || (item.Result != nil || item.Error != nil) {
			if item.ID == targetID {
				return &item, true
			}
			if firstValid == nil {
				cp := item
				firstValid = &cp
			}
		}
		return nil, false
	}

	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			if matched, ok := flush(); ok {
				return *matched, nil
			}
			continue
		}
		if strings.HasPrefix(line, "data:") {
			if dataBuf.Len() > 0 {
				dataBuf.WriteByte('\n')
			}
			dataBuf.WriteString(strings.TrimSpace(strings.TrimPrefix(line, "data:")))
		}
	}
	if err := scanner.Err(); err != nil {
		return jsonRPCResponse{}, err
	}
	if matched, ok := flush(); ok {
		return *matched, nil
	}
	if firstValid != nil {
		return *firstValid, nil
	}
	return jsonRPCResponse{}, errors.New("MCP SSE 响应中未包含有效的 JSON-RPC 结果")
}

// ensureInitialized 按 MCP 协议尝试发送 initialize 握手与 notifications/initialized；若服务端为无状态极简实现则优雅降级
func (c *MCPClient) ensureInitialized(ctx context.Context) {
	c.mu.Lock()
	already := c.initialized
	c.mu.Unlock()
	if already {
		return
	}

	_, err := c.callRPC(ctx, "initialize", map[string]any{
		"protocolVersion": "2024-11-05",
		"capabilities":    map[string]any{},
		"clientInfo": map[string]any{
			"name":    "zev-agent",
			"version": "1.0.0",
		},
	}, false)
	if err == nil {
		_, _ = c.callRPC(ctx, "notifications/initialized", map[string]any{}, true)
	}
	c.mu.Lock()
	c.initialized = true
	c.mu.Unlock()
}

// DiscoverTools 调用 MCP 的 tools/list 方法发现外部工具并包装为统一 Tool 实例
func (c *MCPClient) DiscoverTools(ctx context.Context) ([]Tool, error) {
	c.ensureInitialized(ctx)

	resultRaw, err := c.callRPC(ctx, "tools/list", map[string]any{}, false)
	if err != nil {
		return nil, err
	}
	var payload struct {
		Tools []struct {
			Name        string         `json:"name"`
			Description string         `json:"description"`
			InputSchema map[string]any `json:"inputSchema"`
		} `json:"tools"`
	}
	if err := json.Unmarshal(resultRaw, &payload); err != nil {
		return nil, err
	}

	risk := strings.TrimSpace(c.cfg.RiskLevel)
	if risk == "" {
		// 外部 MCP 工具默认按高风险对待，由护栏决定是否需要人工审批
		risk = guardrail.RiskHigh
	}
	prefix := strings.TrimSpace(c.cfg.Name)
	tools := make([]Tool, 0, len(payload.Tools))
	for _, item := range payload.Tools {
		remoteName := item.Name
		localName := remoteName
		if prefix != "" {
			localName = "mcp_" + prefix + "_" + remoteName
		}
		schema := item.InputSchema
		if schema == nil {
			schema = map[string]any{"type": "object", "properties": map[string]any{}}
		}
		meta := Meta{
			Name:        localName,
			Title:       fmt.Sprintf("[MCP:%s] %s", prefix, remoteName),
			Description: item.Description,
			Source:      "mcp",
			RiskLevel:   risk,
			Parameters:  schema,
		}
		tools = append(tools, NewFuncTool(meta, func(callCtx context.Context, args map[string]any) (string, error) {
			return c.CallTool(callCtx, remoteName, args)
		}))
	}
	return tools, nil
}

// CallTool 调用 MCP 远端 tools/call 并提取文本响应
func (c *MCPClient) CallTool(ctx context.Context, name string, args map[string]any) (string, error) {
	c.ensureInitialized(ctx)

	resultRaw, err := c.callRPC(ctx, "tools/call", map[string]any{
		"name":      name,
		"arguments": args,
	}, false)
	if err != nil {
		return "", err
	}
	var payload struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		IsError bool `json:"isError"`
	}
	if err := json.Unmarshal(resultRaw, &payload); err != nil {
		return string(resultRaw), nil
	}
	var texts []string
	for _, item := range payload.Content {
		if item.Text != "" {
			texts = append(texts, item.Text)
		}
	}
	out := strings.Join(texts, "\n")
	if payload.IsError {
		return out, fmt.Errorf("MCP 工具执行返回错误: %s", out)
	}
	return out, nil
}
