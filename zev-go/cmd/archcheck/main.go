package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// Violation 表示一条架构守卫违规记录，内置给开发者的修复指引。
type Violation struct {
	RuleID      string `json:"ruleId"`
	Severity    string `json:"severity"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Message     string `json:"message"`
	Remediation string `json:"remediation"`
}

type report struct {
	Violations []Violation `json:"violations"`
}

var (
	allowRe = regexp.MustCompile(`//\s*harness:allow\s+([A-Z0-9-]+)(?:\s+(.*))?$`)
	// 严禁在 controller 中绕过 pkg/response 直接调用的 Gin 响应方法。
	forbiddenGinRespMethods = map[string]bool{
		"JSON":                true,
		"PureJSON":            true,
		"IndentedJSON":        true,
		"AsciiJSON":           true,
		"SecureJSON":          true,
		"JSONP":               true,
		"AbortWithStatusJSON": true,
		"String":              true,
		"XML":                 true,
		"YAML":                true,
	}
)

func main() {
	root := flag.String("root", ".", "zev-go 根目录路径")
	format := flag.String("format", "text", "输出格式: text | json")
	prefix := flag.String("prefix", "zev-go", "输出路径前缀")
	flag.Parse()

	violations, err := Run(*root, *prefix)
	if err != nil {
		fmt.Fprintf(os.Stderr, "archcheck 执行失败: %v\n", err)
		os.Exit(2)
	}

	if *format == "json" {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(report{Violations: violations})
	} else {
		printTextReport(violations)
	}

	for _, v := range violations {
		if v.Severity == "error" {
			os.Exit(1)
		}
	}
}

// Run 扫描 root/modules 下的所有非测试 Go 文件并返回排序后的违规清单。
func Run(root, pathPrefix string) ([]Violation, error) {
	modulesDir := filepath.Join(root, "modules")
	info, err := os.Stat(modulesDir)
	if err != nil || !info.IsDir() {
		return nil, fmt.Errorf("未找到 modules 目录: %s", modulesDir)
	}

	fset := token.NewFileSet()
	violations := make([]Violation, 0)

	err = filepath.WalkDir(modulesDir, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".go") || strings.HasSuffix(d.Name(), "_test.go") {
			return nil
		}

		relFromRoot, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		relPosix := filepath.ToSlash(relFromRoot)
		displayFile := relPosix
		if pathPrefix != "" {
			displayFile = strings.TrimSuffix(filepath.ToSlash(pathPrefix), "/") + "/" + relPosix
		}

		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		fileAST, err := parser.ParseFile(fset, path, src, parser.ParseComments)
		if err != nil {
			return fmt.Errorf("解析 Go 文件失败 %s: %w", displayFile, err)
		}

		lines := strings.Split(string(src), "\n")
		fileViolations := inspectFile(fset, fileAST, lines, relPosix, displayFile)
		violations = append(violations, fileViolations...)
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(violations, func(i, j int) bool {
		if violations[i].File != violations[j].File {
			return violations[i].File < violations[j].File
		}
		if violations[i].Line != violations[j].Line {
			return violations[i].Line < violations[j].Line
		}
		return violations[i].RuleID < violations[j].RuleID
	})

	return violations, nil
}

func inspectFile(fset *token.FileSet, f *ast.File, lines []string, relPosix, displayFile string) []Violation {
	modName, layer := parseModuleLayer(relPosix)
	if modName == "" {
		return nil
	}

	var out []Violation
	addViolation := func(ruleID, severity string, pos token.Pos, msg, remediation string) {
		line := fset.Position(pos).Line
		if isAllowed(lines, line, ruleID) {
			return
		}
		out = append(out, Violation{
			RuleID:      ruleID,
			Severity:    severity,
			File:        displayFile,
			Line:        line,
			Message:     msg,
			Remediation: remediation,
		})
	}

	// 检查 import 语句：controller 禁引 gorm + 分层单向依赖约束
	for _, imp := range f.Imports {
		importPath := strings.Trim(imp.Path.Value, `"`)

		if layer == "controller" && isGormImport(importPath) {
			addViolation(
				"GO-CTRL-NO-GORM",
				"error",
				imp.Pos(),
				fmt.Sprintf("controller 层禁止直接导入 %s", importPath),
				fmt.Sprintf("请将数据访问逻辑下沉至 modules/%s/service/，controller 仅通过 service 接口交互。", modName),
			)
		}

		if msg, rem := checkLayerImport(modName, layer, importPath); msg != "" {
			addViolation("GO-LAYER-DEPENDENCY", "error", imp.Pos(), msg, rem)
		}
	}

	// controller 专属 AST 规则
	if layer == "controller" {
		inspectControllerAST(f, addViolation, modName)
	}

	return out
}

func inspectControllerAST(
	f *ast.File,
	addViolation func(ruleID, severity string, pos token.Pos, msg, remediation string),
	modName string,
) {
	// 1. 禁止在 controller 内就地定义非 *Controller 结构体
	for _, decl := range f.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.TYPE {
			continue
		}
		for _, spec := range gen.Specs {
			ts, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}
			if _, isStruct := ts.Type.(*ast.StructType); isStruct && !strings.HasSuffix(ts.Name.Name, "Controller") {
				addViolation(
					"GO-CTRL-NO-LOCAL-DTO",
					"error",
					ts.Pos(),
					fmt.Sprintf("controller 层禁止就地定义非 Controller 结构体 %q", ts.Name.Name),
					fmt.Sprintf("请将请求/响应或内部数据结构迁移至 modules/%s/dto/。", modName),
				)
			}
		}
	}

	// 2. 禁止直接访问 .DB 与绕过 pkg/response 调用 Gin 原始响应方法
	ast.Inspect(f, func(n ast.Node) bool {
		switch node := n.(type) {
		case *ast.SelectorExpr:
			if node.Sel.Name == "DB" {
				addViolation(
					"GO-CTRL-NO-GORM",
					"error",
					node.Sel.Pos(),
					"controller 层禁止直接访问 .DB 实例",
					fmt.Sprintf("请将数据库查询与事务编排封装到 modules/%s/service/ 方法中。", modName),
				)
			}
		case *ast.CallExpr:
			sel, ok := node.Fun.(*ast.SelectorExpr)
			if !ok || !forbiddenGinRespMethods[sel.Sel.Name] {
				return true
			}
			// Gin 的 JSON/String/XML 等响应至少包含 statusCode + payload 两个参数，借此避开 fmt.Stringer.String() 等无参方法
			if len(node.Args) < 2 {
				return true
			}
			addViolation(
				"GO-CTRL-USE-RESPONSE",
				"error",
				sel.Sel.Pos(),
				fmt.Sprintf("controller 层禁止直接调用 .%s(...) 绕过统一响应封装", sel.Sel.Name),
				"请统一使用 zev-go/pkg/response（如 response.Success / response.Fail / response.PageSuccess）；如确需自定义流式或文件输出，可添加 `// harness:allow GO-CTRL-USE-RESPONSE <原因>`。",
			)
		}
		return true
	})
}

func checkLayerImport(modName, layer, importPath string) (string, string) {
	if !strings.HasPrefix(importPath, "zev-go/modules/") && !isGormImport(importPath) {
		return "", ""
	}

	// 跨模块 controller 隔离
	if targetMod, targetLayer := parseImportModuleLayer(importPath); targetMod != "" {
		if targetLayer == "controller" && targetMod != modName {
			return fmt.Sprintf("模块 %s 禁止跨模块导入 %s", modName, importPath),
				"请通过 service 接口或 pkg/event 事件总线解耦跨模块通信，禁止直接引用其他模块的 controller。"
		}

		switch layer {
		case "entity":
			if targetLayer == "dto" || targetLayer == "service" || targetLayer == "controller" {
				return fmt.Sprintf("entity 层禁止反向依赖 %s", importPath),
					"依赖方向必须单向收敛：controller -> service -> dto/entity，entity 仅依赖基础包或同级模型。"
			}
		case "dto":
			if targetLayer == "service" || targetLayer == "controller" {
				return fmt.Sprintf("dto 层禁止反向依赖 %s", importPath),
					"dto 仅用于输入校验与输出视图，禁止依赖 service 或 controller。"
			}
		case "service":
			if targetLayer == "controller" {
				return fmt.Sprintf("service 层禁止反向依赖 %s", importPath),
					"service 层不得反向引用 controller，请将共享类型下沉至 dto 或 entity。"
			}
		}
	}

	if layer == "dto" && isGormImport(importPath) {
		return fmt.Sprintf("dto 层禁止导入 %s", importPath),
			"请保持 dto 为纯数据传输结构体，ORM 映射标签与数据库依赖仅保留在 entity 与 service 层。"
	}

	return "", ""
}

func isGormImport(importPath string) bool {
	return importPath == "gorm.io" || strings.HasPrefix(importPath, "gorm.io/")
}

// parseModuleLayer 从如 "modules/system/controller/user.go" 中提取 ("system", "controller")。
func parseModuleLayer(relPosix string) (string, string) {
	parts := strings.Split(relPosix, "/")
	if len(parts) < 3 || parts[0] != "modules" {
		return "", ""
	}
	modName := parts[1]
	layer := ""
	if len(parts) >= 4 {
		layer = parts[2]
	}
	return modName, layer
}

func parseImportModuleLayer(importPath string) (string, string) {
	const prefix = "zev-go/modules/"
	if !strings.HasPrefix(importPath, prefix) {
		return "", ""
	}
	rest := strings.TrimPrefix(importPath, prefix)
	parts := strings.Split(rest, "/")
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], parts[1]
}

// isAllowed 检查目标行或紧邻上一行是否包含带非空原因的 `// harness:allow <RULE_ID> <reason>`。
func isAllowed(lines []string, line int, ruleID string) bool {
	for _, idx := range []int{line - 1, line - 2} {
		if idx < 0 || idx >= len(lines) {
			continue
		}
		m := allowRe.FindStringSubmatch(lines[idx])
		if len(m) >= 3 && m[1] == ruleID && len(strings.TrimSpace(m[2])) >= 2 {
			return true
		}
	}
	return false
}

func printTextReport(violations []Violation) {
	if len(violations) == 0 {
		fmt.Println("archcheck: 所有 Go 架构守卫检查通过 (0 violations)")
		return
	}
	for _, v := range violations {
		fmt.Printf("[%s] %s (%s:%d)\n  原因: %s\n  修复: %s\n",
			strings.ToUpper(v.Severity), v.RuleID, v.File, v.Line, v.Message, v.Remediation)
	}
}
