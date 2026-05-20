package swagger

import (
	"log"
	"os/exec"
)

// AutoUpdate 自动在后台更新 Swagger 文档
func AutoUpdate() {
	log.Println("正在生成 Swagger 文档...")

	// 使用协程在后台生成，避免阻塞主程序启动
	go func() {
		cmd := exec.Command("go", "run", "github.com/swaggo/swag/cmd/swag@latest", "init", "--parseDependency", "--parseInternal")
		
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("Swagger 文档自动更新失败: %v\n%s", err, string(output))
		} else {
			log.Println("Swagger 文档自动更新成功")
		}
	}()
}
