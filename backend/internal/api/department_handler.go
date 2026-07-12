package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/gofiber/fiber/v3"
)

const maxBodyBytes = 1 << 20

type DepartmentHandler struct {
	svc core.DepartmentServicer
}

func NewDepartmentHandler(svc core.DepartmentServicer) *DepartmentHandler {
	return &DepartmentHandler{svc: svc}
}

func (h *DepartmentHandler) Create(c fiber.Ctx) error {
	var req core.CreateDepartmentRequest
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}

	dept, err := h.svc.CreateDepartment(c.Context(), req)
	if err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusCreated, dept)
}

func (h *DepartmentHandler) List(c fiber.Ctx) error {
	depts, err := h.svc.ListDepartments(c.Context())
	if err != nil {
		return writeDomainError(c, err)
	}

	if depts == nil {
		depts = []core.Department{}
	}

	return writeData(c, fiber.StatusOK, depts)
}

func (h *DepartmentHandler) Get(c fiber.Ctx) error {
	dept, err := h.svc.GetDepartment(c.Context(), c.Params("id"))
	if err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusOK, dept)
}

func (h *DepartmentHandler) Update(c fiber.Ctx) error {
	var req core.UpdateDepartmentRequest
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}

	dept, err := h.svc.UpdateDepartment(c.Context(), c.Params("id"), req)
	if err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusOK, dept)
}

func (h *DepartmentHandler) UpdateStatus(c fiber.Ctx) error {
	var req core.UpdateDepartmentStatusRequest
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}

	dept, err := h.svc.UpdateDepartmentStatus(c.Context(), c.Params("id"), req)
	if err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusOK, dept)
}

func (h *DepartmentHandler) Replace(c fiber.Ctx) error {
	var req struct {
		Name     string  `json:"name"`
		Code     string  `json:"code"`
		ParentID *string `json:"parentId"`
		Status   string  `json:"status"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Code) == "" {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "name and code are required.")
	}

	name := req.Name
	code := req.Code
	dept, err := h.svc.UpdateDepartment(c.Context(), c.Params("id"), core.UpdateDepartmentRequest{
		Name: &name,
		Code: &code,
		ParentID: core.OptionalNullableUUID{
			Value:   req.ParentID,
			Present: true,
		},
	})
	if err != nil {
		return writeDomainError(c, err)
	}

	if status := strings.TrimSpace(req.Status); status != "" && status != dept.Status {
		dept, err = h.svc.UpdateDepartmentStatus(c.Context(), c.Params("id"), core.UpdateDepartmentStatusRequest{
			Status: status,
		})
		if err != nil {
			return writeDomainError(c, err)
		}
	}

	return writeData(c, fiber.StatusOK, dept)
}

func (h *DepartmentHandler) Delete(c fiber.Ctx) error {
	deleter, ok := h.svc.(interface {
		DeleteDepartment(ctx context.Context, id string) error
	})
	if !ok {
		return writeError(c, fiber.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
	}

	if err := deleter.DeleteDepartment(c.Context(), c.Params("id")); err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusOK, fiber.Map{"deleted": true})
}

func decodeBody(c fiber.Ctx, v any) error {
	body := c.Body()
	if len(body) > maxBodyBytes {
		return errors.New("request body too large")
	}
	if len(body) == 0 {
		return errors.New("request body must not be empty")
	}

	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()

	if err := dec.Decode(v); err != nil {
		return fmt.Errorf("malformed JSON body: %w", err)
	}

	if dec.More() {
		return errors.New("request body must contain exactly one JSON object")
	}

	return nil
}

func writeDomainError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, core.ErrDepartmentNotFound):
		return writeError(c, fiber.StatusNotFound, "department_not_found", "Department not found.")
	case errors.Is(err, core.ErrParentDepartmentNotFound):
		return writeError(c, fiber.StatusNotFound, "parent_department_not_found", "Parent department not found.")
	case errors.Is(err, core.ErrDepartmentNameConflict):
		return writeError(c, fiber.StatusConflict, "department_name_conflict", "A department with this name already exists.")
	case errors.Is(err, core.ErrDepartmentCodeConflict):
		return writeError(c, fiber.StatusConflict, "department_code_conflict", "A department with this code already exists.")
	case errors.Is(err, core.ErrInvalidDepartmentHierarchy):
		return writeError(c, fiber.StatusConflict, "invalid_department_hierarchy", "This change would create an invalid or circular hierarchy.")
	case errors.Is(err, core.ErrInvalidDepartmentStatus):
		return writeError(c, fiber.StatusBadRequest, "invalid_status", "Status must be 'active' or 'inactive'.")
	case errors.Is(err, core.ErrDepartmentInUse):
		return writeError(c, fiber.StatusConflict, "department_in_use", "Department cannot be deleted while it is still referenced.")
	case errors.Is(err, core.ErrInvalidInput):
		return writeError(c, fiber.StatusBadRequest, "invalid_input", err.Error())
	default:
		slog.Error("unhandled department error", "err", err)
		return writeError(c, fiber.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
	}
}
