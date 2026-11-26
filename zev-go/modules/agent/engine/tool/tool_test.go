package tool

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMCPClientDiscoverAndCall(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req jsonRPCRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		w.Header().Set("Content-Type", "application/json")
		switch req.Method {
		case "tools/list":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"jsonrpc": "2.0",
				"id":      req.ID,
				"result": map[string]any{
					"tools": []map[string]any{{
						"name":        "ping_host",
						"description": "检测主机状态",
						"inputSchema": map[string]any{"type": "object", "properties": map[string]any{"host": map[string]any{"type": "string"}}},
					}},
				},
			})
		case "tools/call":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"jsonrpc": "2.0",
				"id":      req.ID,
				"result": map[string]any{
					"content": []map[string]any{{"type": "text", "text": "host ok"}},
				},
			})
		}
	}))
	defer srv.Close()

	client := NewMCPClient(MCPServerConfig{Name: "ops", URL: srv.URL, Enabled: true})
	tools, err := client.DiscoverTools(context.Background())
	if err != nil {
		t.Fatalf("DiscoverTools failed: %v", err)
	}
	if len(tools) != 1 || tools[0].Meta().Name != "mcp_ops_ping_host" {
		t.Fatalf("unexpected discovered tools: %+v", tools)
	}
	out, err := tools[0].Execute(context.Background(), `{"host":"10.0.0.1"}`)
	if err != nil || out != "host ok" {
		t.Fatalf("unexpected tool output: %q err=%v", out, err)
	}
}

func TestValidateEndpointURLSSRFAndStreamableSSE(t *testing.T) {
	if err := ValidateEndpointURL("http://169.254.169.254/latest/meta-data", true); err == nil {
		t.Fatal("expected metadata IP to be blocked even when allowPrivate=true")
	}
	if err := ValidateEndpointURL("http://metadata.google.internal/computeMetadata/v1", true); err == nil {
		t.Fatal("expected metadata host to be blocked")
	}
	if err := ValidateEndpointURL("file:///etc/passwd", true); err == nil {
		t.Fatal("expected non-http scheme to be blocked")
	}
	if err := ValidateEndpointURL("http://10.0.0.5:8080/mcp", false); err == nil {
		t.Fatal("expected private IP to be blocked when allowPrivate=false")
	}

	var gotSessionHeader string
	var initialized bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req jsonRPCRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		switch req.Method {
		case "initialize":
			w.Header().Set("Mcp-Session-Id", "sess-abc")
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"jsonrpc": "2.0",
				"id":      req.ID,
				"result":  map[string]any{"protocolVersion": "2024-11-05"},
			})
		case "notifications/initialized":
			initialized = true
			w.WriteHeader(http.StatusAccepted)
		case "tools/list":
			gotSessionHeader = r.Header.Get("Mcp-Session-Id")
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = w.Write([]byte("event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"tools\":[{\"name\":\"sse_tool\",\"description\":\"SSE 工具\"}]}}\n\n"))
		}
	}))
	defer srv.Close()

	client := NewMCPClientWithHTTPClient(MCPServerConfig{Name: "sse", URL: srv.URL, Enabled: true}, srv.Client())
	tools, err := client.DiscoverTools(context.Background())
	if err != nil {
		t.Fatalf("DiscoverTools over SSE failed: %v", err)
	}
	if !initialized || gotSessionHeader != "sess-abc" || len(tools) != 1 || tools[0].Meta().Name != "mcp_sse_sse_tool" {
		t.Fatalf("unexpected MCP handshake/SSE result: initialized=%v sid=%q tools=%+v", initialized, gotSessionHeader, tools)
	}
}
