package service

import (
	"errors"
	"strconv"
	"strings"

	"zev-go/modules/system/dto"
	"zev-go/modules/system/entity"
	"zev-go/pkg/crud"
	"zev-go/pkg/datascope"

	"gorm.io/gorm"
)

type DeptService struct {
	*crud.BaseService[entity.Dept]
}

func NewDeptService(db *gorm.DB) *DeptService {
	return &DeptService{
		BaseService: crud.NewBaseService[entity.Dept](db),
	}
}

// GetDeptTree 获取部门树；ignoreScope 为 false 时按当前用户数据范围裁剪并重建森林结构
func (s *DeptService) GetDeptTree(scope *datascope.Scope, keyword string, status *int, ignoreScope bool) ([]dto.DeptTreeRes, error) {
	var allDepts []entity.Dept
	if err := s.DB.Order("sort asc, id asc").Find(&allDepts).Error; err != nil {
		return nil, err
	}

	kw := strings.ToLower(strings.TrimSpace(keyword))
	visibleDepts := make([]entity.Dept, 0, len(allDepts))
	for _, d := range allDepts {
		if !ignoreScope && !datascope.CanAccessDept(scope, d.ID) {
			continue
		}
		if status != nil && d.Status != *status {
			continue
		}
		if kw != "" {
			nameMatch := strings.Contains(strings.ToLower(d.Name), kw)
			codeMatch := strings.Contains(strings.ToLower(d.Code), kw)
			leaderMatch := strings.Contains(strings.ToLower(d.Leader), kw)
			if !nameMatch && !codeMatch && !leaderMatch {
				continue
			}
		}
		visibleDepts = append(visibleDepts, d)
	}

	return buildDeptForest(visibleDepts), nil
}

// ListWithFilter 获取受数据权限约束的分页部门列表
func (s *DeptService) ListWithFilter(scope *datascope.Scope, page, pageSize int, keyword string) ([]entity.Dept, int64, error) {
	var entities []entity.Dept
	var total int64

	db := s.DB.Model(&entity.Dept{}).
		Scopes(datascope.Apply(scope, datascope.Options{
			DeptColumn: "id",
			UserColumn: "-",
		}))

	if kw := strings.TrimSpace(keyword); kw != "" {
		like := "%" + kw + "%"
		db = db.Where("name LIKE ? OR code LIKE ? OR leader LIKE ?", like, like, like)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := db.Order("sort asc, id asc").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&entities).Error
	return entities, total, err
}

// GetDeptByID 根据数据权限范围获取单个部门详情
func (s *DeptService) GetDeptByID(scope *datascope.Scope, id uint) (*entity.Dept, error) {
	if id == 0 {
		return nil, errors.New("部门ID不能为空")
	}
	dept, err := s.GetByID(id)
	if err != nil {
		return nil, errors.New("部门不存在")
	}
	if !datascope.CanAccessDept(scope, dept.ID) {
		return nil, errors.New("无权访问该部门")
	}
	return dept, nil
}

// GetDeptAndChildIDs 返回指定部门自身及其全部子孙部门 ID 列表
func (s *DeptService) GetDeptAndChildIDs(deptID uint) ([]uint, error) {
	if deptID == 0 {
		return nil, nil
	}

	var nodes []datascope.DeptNode
	err := s.DB.Table("depts").
		Select("id, parent_id, ancestors").
		Where("deleted_at IS NULL").
		Scan(&nodes).Error
	if err != nil {
		return nil, err
	}

	return datascope.CollectDeptAndChildren(deptID, nodes), nil
}

// CreateDept 新增部门并维护 ancestors 物化路径及上级归属权限校验
func (s *DeptService) CreateDept(scope *datascope.Scope, req dto.DeptCreateUpdateReq) error {
	name := strings.TrimSpace(req.Name)
	code := strings.TrimSpace(req.Code)
	if name == "" || code == "" {
		return errors.New("部门名称和编码不能为空")
	}

	ancestors := "0"
	if req.ParentID == 0 {
		if scope == nil || (!scope.IsSuperAdmin && !scope.AllData) {
			return errors.New("无权创建顶级部门")
		}
	} else {
		var parent entity.Dept
		if err := s.DB.First(&parent, req.ParentID).Error; err != nil {
			return errors.New("上级部门不存在")
		}
		if !datascope.CanAccessDept(scope, parent.ID) {
			return errors.New("无权在目标上级部门下创建子部门")
		}
		ancestors = buildChildAncestors(parent.Ancestors, parent.ID)
	}

	var dupCount int64
	if err := s.DB.Model(&entity.Dept{}).Where("code = ?", code).Count(&dupCount).Error; err != nil {
		return err
	}
	if dupCount > 0 {
		return errors.New("部门编码已存在")
	}

	dept := entity.Dept{
		ParentID:  req.ParentID,
		Ancestors: ancestors,
		Name:      name,
		Code:      code,
		Leader:    strings.TrimSpace(req.Leader),
		Phone:     strings.TrimSpace(req.Phone),
		Email:     strings.TrimSpace(req.Email),
		Sort:      req.Sort,
		Status:    req.Status,
	}

	return s.Create(&dept)
}

// UpdateDept 更新部门信息并在变更上级部门时级联刷新所有子孙节点的 ancestors
func (s *DeptService) UpdateDept(scope *datascope.Scope, req dto.DeptCreateUpdateReq) error {
	if req.ID == 0 {
		return errors.New("部门ID不能为空")
	}

	oldDept, err := s.GetByID(req.ID)
	if err != nil {
		return errors.New("部门不存在")
	}
	if !datascope.CanAccessDept(scope, oldDept.ID) {
		return errors.New("无权修改该部门")
	}
	if req.ParentID == oldDept.ID {
		return errors.New("上级部门不能选择当前部门自身")
	}

	name := strings.TrimSpace(req.Name)
	code := strings.TrimSpace(req.Code)
	if name == "" || code == "" {
		return errors.New("部门名称和编码不能为空")
	}

	var dupCount int64
	if err := s.DB.Model(&entity.Dept{}).Where("code = ? AND id <> ?", code, oldDept.ID).Count(&dupCount).Error; err != nil {
		return err
	}
	if dupCount > 0 {
		return errors.New("部门编码已存在")
	}

	newAncestors := oldDept.Ancestors
	oldChildPrefix := buildChildAncestors(oldDept.Ancestors, oldDept.ID)
	parentChanged := req.ParentID != oldDept.ParentID

	if parentChanged {
		if req.ParentID == 0 {
			if scope == nil || (!scope.IsSuperAdmin && !scope.AllData) {
				return errors.New("无权将部门调整为顶级部门")
			}
			newAncestors = "0"
		} else {
			var newParent entity.Dept
			if err := s.DB.First(&newParent, req.ParentID).Error; err != nil {
				return errors.New("目标上级部门不存在")
			}
			if !datascope.CanAccessDept(scope, newParent.ID) {
				return errors.New("无权将部门调整至目标上级部门")
			}
			if isDescendantAncestors(newParent.Ancestors, oldChildPrefix) {
				return errors.New("上级部门不能选择当前部门的下级部门")
			}
			newAncestors = buildChildAncestors(newParent.Ancestors, newParent.ID)
		}
	}

	newChildPrefix := buildChildAncestors(newAncestors, oldDept.ID)

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.Dept{}).
			Where("id = ?", oldDept.ID).
			Updates(map[string]any{
				"parent_id": req.ParentID,
				"ancestors": newAncestors,
				"name":      name,
				"code":      code,
				"leader":    strings.TrimSpace(req.Leader),
				"phone":     strings.TrimSpace(req.Phone),
				"email":     strings.TrimSpace(req.Email),
				"sort":      req.Sort,
				"status":    req.Status,
			}).Error; err != nil {
			return err
		}

		if parentChanged && oldChildPrefix != newChildPrefix {
			var descendants []entity.Dept
			if err := tx.Select("id", "ancestors").
				Where("ancestors = ? OR ancestors LIKE ?", oldChildPrefix, oldChildPrefix+",%").
				Find(&descendants).Error; err != nil {
				return err
			}
			for _, desc := range descendants {
				updated := newChildPrefix + strings.TrimPrefix(desc.Ancestors, oldChildPrefix)
				if err := tx.Model(&entity.Dept{}).Where("id = ?", desc.ID).Update("ancestors", updated).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

// DeleteDept 删除部门，拦截存在子部门或归属用户的情况并清理角色自定义部门关联
func (s *DeptService) DeleteDept(scope *datascope.Scope, id uint) error {
	if id == 0 {
		return errors.New("部门ID不能为空")
	}
	if _, err := s.GetByID(id); err != nil {
		return errors.New("部门不存在")
	}
	if !datascope.CanAccessDept(scope, id) {
		return errors.New("无权删除该部门")
	}

	var childCount int64
	if err := s.DB.Model(&entity.Dept{}).Where("parent_id = ?", id).Count(&childCount).Error; err != nil {
		return err
	}
	if childCount > 0 {
		return errors.New("存在下级部门，请先删除或迁移子部门")
	}

	var userCount int64
	if err := s.DB.Model(&entity.User{}).Where("dept_id = ?", id).Count(&userCount).Error; err != nil {
		return err
	}
	if userCount > 0 {
		return errors.New("该部门下仍有用户，请先调整用户归属部门")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("sys_role_depts").Where("dept_id = ?", id).Delete(nil).Error; err != nil {
			return err
		}
		return tx.Delete(&entity.Dept{}, id).Error
	})
}

func buildChildAncestors(parentAncestors string, parentID uint) string {
	parentIDStr := strconv.FormatUint(uint64(parentID), 10)
	if parentAncestors == "" {
		return "0," + parentIDStr
	}
	return parentAncestors + "," + parentIDStr
}

func isDescendantAncestors(candidateAncestors, prefix string) bool {
	return candidateAncestors == prefix || strings.HasPrefix(candidateAncestors, prefix+",")
}

// buildDeptForest 将可见部门节点挂载为树形森林：父节点不可见时自动提升为根节点
func buildDeptForest(depts []entity.Dept) []dto.DeptTreeRes {
	visibleMap := make(map[uint]struct{}, len(depts))
	for _, d := range depts {
		visibleMap[d.ID] = struct{}{}
	}

	childrenMap := make(map[uint][]entity.Dept)
	roots := make([]entity.Dept, 0)
	for _, d := range depts {
		if _, parentVisible := visibleMap[d.ParentID]; d.ParentID == 0 || !parentVisible {
			roots = append(roots, d)
		} else {
			childrenMap[d.ParentID] = append(childrenMap[d.ParentID], d)
		}
	}

	var buildNode func(item entity.Dept) dto.DeptTreeRes
	buildNode = func(item entity.Dept) dto.DeptTreeRes {
		subs := childrenMap[item.ID]
		children := make([]dto.DeptTreeRes, 0, len(subs))
		for _, sub := range subs {
			children = append(children, buildNode(sub))
		}
		return dto.DeptTreeRes{
			Dept:     item,
			Children: children,
		}
	}

	forest := make([]dto.DeptTreeRes, 0, len(roots))
	for _, root := range roots {
		forest = append(forest, buildNode(root))
	}
	return forest
}
