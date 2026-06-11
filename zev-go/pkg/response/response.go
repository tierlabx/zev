package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
	Msg  string      `json:"msg"`
}

// PageData 分页响应数据结构
type PageData struct {
	List  interface{} `json:"list"`
	Total int64       `json:"total"`
}

const (
	CodeSuccess = 200
	CodeError   = 500
)

func Result(code int, data interface{}, msg string, c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code: code,
		Data: data,
		Msg:  msg,
	})
}

func Success(c *gin.Context) {
	Result(CodeSuccess, map[string]interface{}{}, "操作成功", c)
}

func SuccessData(data interface{}, c *gin.Context) {
	Result(CodeSuccess, data, "操作成功", c)
}

func SuccessDetailed(data interface{}, msg string, c *gin.Context) {
	Result(CodeSuccess, data, msg, c)
}

func Fail(c *gin.Context) {
	Result(CodeError, map[string]interface{}{}, "操作失败", c)
}

func FailMessage(msg string, c *gin.Context) {
	Result(CodeError, map[string]interface{}{}, msg, c)
}

func FailDetailed(data interface{}, msg string, c *gin.Context) {
	Result(CodeError, data, msg, c)
}

func FailUnauthorized(msg string, c *gin.Context) {
	c.JSON(http.StatusUnauthorized, Response{
		Code: 401,
		Data: map[string]interface{}{},
		Msg:  msg,
	})
}
