package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"

	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/gofiber/fiber/v3"
)

const maxBodyBytes = 1 << 20 // 1 MiB

// DepartmentHandler handles HTTP requests for the departments resource.
// It delegates all business logic to the service layer.
type DepartmentHandler struct {
	svc core.DepartmentServicer
}

// NewDepartmentHandler constructs a DepartmentHandler.
func NewDepartmentHandler(svc core.DepartmentServicer) *DepartmentHandler {
	return &DepartmentHandler{svc: svc}
}

// ── POST /api/v1/departments ─────────────────────────────────────────────────

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

// ── GET /api/v1/departments ──────────────────────────────────────────────────

func (h *DepartmentHandler) List(c fiber.Ctx) error {
	depts, err := h.svc.ListDepartments(c.Context())
	if err != nil {
		return writeDomainError(c, err)
	}

	// Guarantee non-null JSON array.
	if depts == nil {
		depts = []core.Department{}
	}

	return writeData(c, fiber.StatusOK, depts)
}

// ── GET /api/v1/departments/:id ─────────────────────────────────────────────

func (h *DepartmentHandler) Get(c fiber.Ctx) error {
	id := c.Params("id")

	dept, err := h.svc.GetDepartment(c.Context(), id)
	if err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusOK, dept)
}

// ── PATCH /api/v1/departments/:id ───────────────────────────────────────────

func (h *DepartmentHandler) Update(c fiber.Ctx) error {
	id := c.Params("id")

	var req core.UpdateDepartmentRequest
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}

	dept, err := h.svc.UpdateDepartment(c.Context(), id, req)
	if err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusOK, dept)
}

// ── PATCH /api/v1/departments/:id/status ────────────────────────────────────

func (h *DepartmentHandler) UpdateStatus(c fiber.Ctx) error {
	id := c.Params("id")

	var req core.UpdateDepartmentStatusRequest
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}

	dept, err := h.svc.UpdateDepartmentStatus(c.Context(), id, req)
	if err != nil {
		return writeDomainError(c, err)
	}

	return writeData(c, fiber.StatusOK, dept)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// decodeBody reads and decodes the JSON body.
// It limits body size, rejects malformed JSON, and rejects trailing objects.
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
		return errors.New("malformed JSON body")
	}

	// Reject trailing JSON objects in the same request.
	if dec.More() {
		return errors.New("request body must contain exactly one JSON object")
	}

	return nil
}

// writeDomainError maps domain errors to HTTP status codes and error responses.
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
	case errors.Is(err, core.ErrInvalidInput):
		return writeError(c, fiber.StatusBadRequest, "invalid_input", err.Error())
	default:
		slog.Error("unhandled department error", "err", err)
		return writeError(c, fiber.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
	}
}
