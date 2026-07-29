package service

import (
	"errors"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/jwtx"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	*crud.BaseService[entity.User]
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{
		BaseService: crud.NewBaseService[entity.User](db),
	}
}

func (s *UserService) Login(req dto.LoginReq) (*dto.LoginRes, error) {
	var user entity.User
	err := s.DB.Where("username = ?", req.Username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	if user.Status == 1 {
		return nil, errors.New("账号已被禁用，请联系管理员")
	}

	// 查询角色名称
	var role entity.Role
	roleName := ""
	if err := s.DB.Select("name").First(&role, user.RoleID).Error; err == nil {
		roleName = role.Name
	}

	token, err := jwtx.GenerateToken(user.ID, user.Username, user.RoleID)
	if err != nil {
		return nil, errors.New("Token生成失败")
	}

	return &dto.LoginRes{
		Token:    token,
		Nickname: user.Nickname,
		RoleID:   user.RoleID,
		RoleName: roleName,
		Avatar:   user.Avatar,
	}, nil
}

func (s *UserService) AssignRole(userID uint, roleID uint) error {
	return s.DB.Model(&entity.User{}).Where("id = ?", userID).Update("role_id", roleID).Error
}

func (s *UserService) ListWithKeyword(page, pageSize int, keyword string) ([]entity.User, int64, error) {
	var entities []entity.User
	var total int64
	var model entity.User

	db := s.DB.Model(&model)
	if keyword != "" {
		db = db.Where("username LIKE ? OR nickname LIKE ? OR email LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	db.Count(&total)
	err := db.Offset((page - 1) * pageSize).Limit(pageSize).Find(&entities).Error

	return entities, total, err
}
