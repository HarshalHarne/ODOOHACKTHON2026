package api

import (
	"encoding/json"
	"errors"

	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
)

type CategoryHandler struct {
	svc      core.CategoryServicer
	validate *validator.Validate
}

func NewCategoryHandler(svc core.CategoryServicer) *CategoryHandler {
	return &CategoryHandler{
		svc:      svc,
		validate: validator.New(),
	}
}

func (h *CategoryHandler) List(c fiber.Ctx) error {
	categories, err := h.svc.ListCategories(c.Context())
	if err != nil {
		return writeCategoryError(c, err)
	}
	if categories == nil {
		categories = []core.Category{}
	}
	return writeData(c, fiber.StatusOK, categories)
}

func (h *CategoryHandler) Create(c fiber.Ctx) error {
	var req struct {
		Name          string          `json:"name" validate:"required"`
		Description   string          `json:"description"`
		DynamicSchema json.RawMessage `json:"dynamicSchema"`
		Status        string          `json:"status"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}
	if err := h.validate.Struct(struct {
		Name string `validate:"required"`
	}{Name: req.Name}); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "name is required.")
	}

	category, err := h.svc.CreateCategory(c.Context(), core.CreateCategoryRequest{
		Name:          req.Name,
		Description:   req.Description,
		DynamicSchema: req.DynamicSchema,
		Status:        req.Status,
	})
	if err != nil {
		return writeCategoryError(c, err)
	}
	return writeData(c, fiber.StatusCreated, category)
}

func (h *CategoryHandler) Replace(c fiber.Ctx) error {
	var req struct {
		Name          string          `json:"name" validate:"required"`
		Description   string          `json:"description"`
		DynamicSchema json.RawMessage `json:"dynamicSchema"`
		Status        string          `json:"status"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}
	if err := h.validate.Struct(struct {
		Name string `validate:"required"`
	}{Name: req.Name}); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "name is required.")
	}

	category, err := h.svc.UpdateCategory(c.Context(), c.Params("id"), core.UpdateCategoryRequest{
		Name:          req.Name,
		Description:   req.Description,
		DynamicSchema: req.DynamicSchema,
		Status:        req.Status,
	})
	if err != nil {
		return writeCategoryError(c, err)
	}
	return writeData(c, fiber.StatusOK, category)
}

func (h *CategoryHandler) Delete(c fiber.Ctx) error {
	if err := h.svc.DeleteCategory(c.Context(), c.Params("id")); err != nil {
		return writeCategoryError(c, err)
	}
	return writeData(c, fiber.StatusOK, fiber.Map{"deleted": true})
}

func writeCategoryError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, core.ErrCategoryNotFound):
		return writeError(c, fiber.StatusNotFound, "category_not_found", "Category not found.")
	case errors.Is(err, core.ErrCategoryNameConflict):
		return writeError(c, fiber.StatusConflict, "category_name_conflict", "A category with this name already exists.")
	case errors.Is(err, core.ErrInvalidCategoryStatus):
		return writeError(c, fiber.StatusBadRequest, "invalid_status", "Status is invalid.")
	case errors.Is(err, core.ErrInvalidInput):
		return writeError(c, fiber.StatusBadRequest, "invalid_input", err.Error())
	default:
		return writeError(c, fiber.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
	}
}
