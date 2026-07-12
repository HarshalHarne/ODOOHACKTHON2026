package core

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/HarshalHarne/assetflow/internal/db"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrCategoryNotFound      = errors.New("category not found")
	ErrCategoryNameConflict  = errors.New("category name already exists")
	ErrInvalidCategoryStatus = errors.New("invalid category status")
)

type CategoryServicer interface {
	ListCategories(ctx context.Context) ([]Category, error)
	CreateCategory(ctx context.Context, req CreateCategoryRequest) (Category, error)
	UpdateCategory(ctx context.Context, id string, req UpdateCategoryRequest) (Category, error)
	DeleteCategory(ctx context.Context, id string) error
}

type CategoryStore interface {
	CategoryNameExists(ctx context.Context, name string) (bool, error)
	CategoryNameExistsExcludingID(ctx context.Context, arg db.CategoryNameExistsExcludingIDParams) (bool, error)
	CreateCategory(ctx context.Context, arg db.CreateCategoryParams) (db.AssetCategory, error)
	GetCategoryByID(ctx context.Context, id pgtype.UUID) (db.AssetCategory, error)
	ListCategories(ctx context.Context) ([]db.AssetCategory, error)
	UpdateCategory(ctx context.Context, arg db.UpdateCategoryParams) (db.AssetCategory, error)
	UpdateCategoryStatus(ctx context.Context, arg db.UpdateCategoryStatusParams) (db.AssetCategory, error)
}

type CategoryExecutor interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}

type CategoryService struct {
	store CategoryStore
	exec  CategoryExecutor
}

type Category struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Description   string          `json:"description"`
	DynamicSchema json.RawMessage `json:"dynamicSchema"`
	Status        string          `json:"status"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

type CreateCategoryRequest struct {
	Name          string          `json:"name"`
	Description   string          `json:"description"`
	DynamicSchema json.RawMessage `json:"dynamicSchema"`
	Status        string          `json:"status"`
}

type UpdateCategoryRequest struct {
	Name          string          `json:"name"`
	Description   string          `json:"description"`
	DynamicSchema json.RawMessage `json:"dynamicSchema"`
	Status        string          `json:"status"`
}

func NewCategoryService(store CategoryStore) *CategoryService {
	return &CategoryService{store: store}
}

func (s *CategoryService) WithExecutor(exec CategoryExecutor) *CategoryService {
	s.exec = exec
	return s
}

func (s *CategoryService) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := s.store.ListCategories(ctx)
	if err != nil {
		return nil, mapCategoryDBError(err)
	}

	result := make([]Category, 0, len(rows))
	for _, row := range rows {
		result = append(result, categoryToCore(row))
	}
	return result, nil
}

func (s *CategoryService) CreateCategory(ctx context.Context, req CreateCategoryRequest) (Category, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return Category{}, fmt.Errorf("%w: name must not be blank", ErrInvalidInput)
	}

	status, err := normalizeCategoryStatus(req.Status)
	if err != nil {
		return Category{}, err
	}

	exists, err := s.store.CategoryNameExists(ctx, name)
	if err != nil {
		return Category{}, mapCategoryDBError(err)
	}
	if exists {
		return Category{}, ErrCategoryNameConflict
	}

	row, err := s.store.CreateCategory(ctx, db.CreateCategoryParams{
		Name:          name,
		Description:   optionalTrimmedString(req.Description),
		DynamicSchema: normalizeDynamicSchema(req.DynamicSchema),
		Status:        status,
	})
	if err != nil {
		return Category{}, mapCategoryDBError(err)
	}

	return categoryToCore(row), nil
}

func (s *CategoryService) UpdateCategory(ctx context.Context, id string, req UpdateCategoryRequest) (Category, error) {
	uid, err := parseUUID(id)
	if err != nil {
		return Category{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	current, err := s.store.GetCategoryByID(ctx, uid)
	if err != nil {
		return Category{}, mapCategoryDBError(err)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return Category{}, fmt.Errorf("%w: name must not be blank", ErrInvalidInput)
	}

	status, err := normalizeCategoryStatus(req.Status)
	if err != nil {
		return Category{}, err
	}

	conflict, err := s.store.CategoryNameExistsExcludingID(ctx, db.CategoryNameExistsExcludingIDParams{
		Name: name,
		ID:   uid,
	})
	if err != nil {
		return Category{}, mapCategoryDBError(err)
	}
	if conflict {
		return Category{}, ErrCategoryNameConflict
	}

	schema := normalizeDynamicSchema(req.DynamicSchema)
	if len(req.DynamicSchema) == 0 {
		schema = current.DynamicSchema
	}

	row, err := s.store.UpdateCategory(ctx, db.UpdateCategoryParams{
		Name:          name,
		Description:   optionalTrimmedString(req.Description),
		DynamicSchema: schema,
		ID:            uid,
	})
	if err != nil {
		return Category{}, mapCategoryDBError(err)
	}

	if row.Status != status {
		row, err = s.store.UpdateCategoryStatus(ctx, db.UpdateCategoryStatusParams{
			Status: status,
			ID:     uid,
		})
		if err != nil {
			return Category{}, mapCategoryDBError(err)
		}
	}

	return categoryToCore(row), nil
}

func (s *CategoryService) DeleteCategory(ctx context.Context, id string) error {
	if s.exec == nil {
		return errors.New("category delete executor is not configured")
	}

	uid, err := parseUUID(id)
	if err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	tag, err := s.exec.Exec(ctx, "DELETE FROM asset_categories WHERE id = $1", uid)
	if err != nil {
		return mapCategoryDBError(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrCategoryNotFound
	}

	return nil
}

func normalizeCategoryStatus(status string) (db.AssetCategoryStatus, error) {
	if strings.TrimSpace(status) == "" {
		return db.AssetCategoryStatusActive, nil
	}

	value := db.AssetCategoryStatus(strings.TrimSpace(status))
	if !value.Valid() {
		return "", ErrInvalidCategoryStatus
	}

	return value, nil
}

func normalizeDynamicSchema(schema json.RawMessage) []byte {
	if len(schema) == 0 {
		return []byte("{}")
	}
	return []byte(schema)
}

func optionalTrimmedString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func categoryToCore(row db.AssetCategory) Category {
	result := Category{
		ID:            uuidToString(row.ID),
		Name:          row.Name,
		DynamicSchema: json.RawMessage(row.DynamicSchema),
		Status:        string(row.Status),
		CreatedAt:     pgTimestampToTime(row.CreatedAt),
		UpdatedAt:     pgTimestampToTime(row.UpdatedAt),
	}

	if row.Description != nil {
		result.Description = *row.Description
	}

	return result
}

func mapCategoryDBError(err error) error {
	if err == nil {
		return nil
	}

	if isNoRows(err) {
		return ErrCategoryNotFound
	}

	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return err
	}

	switch pgErr.Code {
	case "23505":
		return ErrCategoryNameConflict
	case "23514":
		return ErrInvalidInput
	}

	return err
}
