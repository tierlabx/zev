package dto

import "zev-go/modules/system/entity"

type MenuTreeRes struct {
	entity.Menu
	Children []MenuTreeRes `json:"children"`
}
