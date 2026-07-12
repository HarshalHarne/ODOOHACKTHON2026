package api

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/go-chi/chi/v5"
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

func (h *DepartmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req core.CreateDepartmentRequest
	if err := decodeBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	dept, err := h.svc.CreateDepartment(r.Context(), req)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeData(w, http.StatusCreated, dept)
}

// ── GET /api/v1/departments ──────────────────────────────────────────────────

func (h *DepartmentHandler) List(w http.ResponseWriter, r *http.Request) {
	depts, err := h.svc.ListDepartments(r.Context())
	if err != nil {
		writeDomainError(w, err)
		return
	}

	// Guarantee non-null JSON array.
	if depts == nil {
		depts = []core.Department{}
	}

	writeData(w, http.StatusOK, depts)
}

// ── GET /api/v1/departments/{id} ─────────────────────────────────────────────

func (h *DepartmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	dept, err := h.svc.GetDepartment(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeData(w, http.StatusOK, dept)
}

// ── PATCH /api/v1/departments/{id} ───────────────────────────────────────────

func (h *DepartmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req core.UpdateDepartmentRequest
	if err := decodeBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	dept, err := h.svc.UpdateDepartment(r.Context(), id, req)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeData(w, http.StatusOK, dept)
}

// ── PATCH /api/v1/departments/{id}/status ────────────────────────────────────

func (h *DepartmentHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req core.UpdateDepartmentStatusRequest
	if err := decodeBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	dept, err := h.svc.UpdateDepartmentStatus(r.Context(), id, req)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeData(w, http.StatusOK, dept)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// decodeBody reads and decodes the JSON body.
// It limits body size, rejects malformed JSON, and rejects trailing objects.
func decodeBody(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(v); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			return errors.New("request body too large")
		}
		if err == io.EOF {
			return errors.New("request body must not be empty")
		}
		return errors.New("malformed JSON body")
	}

	// Reject trailing JSON objects in the same request.
	if dec.More() {
		return errors.New("request body must contain exactly one JSON object")
	}

	return nil
}

// writeDomainError maps domain errors to HTTP status codes and error responses.
func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, core.ErrDepartmentNotFound):
		writeError(w, http.StatusNotFound, "department_not_found", "Department not found.")
	case errors.Is(err, core.ErrParentDepartmentNotFound):
		writeError(w, http.StatusNotFound, "parent_department_not_found", "Parent department not found.")
	case errors.Is(err, core.ErrDepartmentNameConflict):
		writeError(w, http.StatusConflict, "department_name_conflict", "A department with this name already exists.")
	case errors.Is(err, core.ErrDepartmentCodeConflict):
		writeError(w, http.StatusConflict, "department_code_conflict", "A department with this code already exists.")
	case errors.Is(err, core.ErrInvalidDepartmentHierarchy):
		writeError(w, http.StatusConflict, "invalid_department_hierarchy", "This change would create an invalid or circular hierarchy.")
	case errors.Is(err, core.ErrInvalidDepartmentStatus):
		writeError(w, http.StatusBadRequest, "invalid_status", "Status must be 'active' or 'inactive'.")
	case errors.Is(err, core.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_input", err.Error())
	default:
		slog.Error("unhandled department error", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
	}
}
