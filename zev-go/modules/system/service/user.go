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

	token, err := jwtx.GenerateToken(user.Username)
	if err != nil {
		return nil, errors.New("Token生成失败")
	}

	return &dto.LoginRes{
		Token:    token,
		Nickname: user.Nickname,
		RoleID:   user.RoleID,
	}, nil
}
