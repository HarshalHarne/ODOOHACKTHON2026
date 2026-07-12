package api

import (
	"errors"

	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
)

type EmployeeHandler struct {
	svc      core.EmployeeServicer
	validate *validator.Validate
}

func NewEmployeeHandler(svc core.EmployeeServicer) *EmployeeHandler {
	return &EmployeeHandler{
		svc:      svc,
		validate: validator.New(),
	}
}

func (h *EmployeeHandler) List(c fiber.Ctx) error {
	employees, err := h.svc.ListEmployees(c.Context())
	if err != nil {
		return writeEmployeeError(c, err)
	}
	if employees == nil {
		employees = []core.Employee{}
	}
	return writeData(c, fiber.StatusOK, employees)
}

func (h *EmployeeHandler) Create(c fiber.Ctx) error {
	var req struct {
		FirstName    string  `json:"firstName"`
		LastName     string  `json:"lastName"`
		Name         string  `json:"name"`
		Email        string  `json:"email" validate:"required,email"`
		Password     string  `json:"password" validate:"required"`
		DepartmentID *string `json:"departmentId"`
		Role         string  `json:"role"`
		Status       string  `json:"status"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}
	if err := h.validate.Struct(struct {
		Email    string `validate:"required,email"`
		Password string `validate:"required"`
	}{Email: req.Email, Password: req.Password}); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "email and password are required.")
	}

	employee, err := h.svc.CreateEmployee(c.Context(), core.CreateEmployeeRequest{
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Name:         req.Name,
		Email:        req.Email,
		Password:     req.Password,
		DepartmentID: req.DepartmentID,
		Role:         req.Role,
		Status:       req.Status,
	})
	if err != nil {
		return writeEmployeeError(c, err)
	}
	return writeData(c, fiber.StatusCreated, employee)
}

func (h *EmployeeHandler) Replace(c fiber.Ctx) error {
	var req struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Name      string `json:"name"`
		Email     string `json:"email" validate:"required,email"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}
	if err := h.validate.Struct(struct {
		Email string `validate:"required,email"`
	}{Email: req.Email}); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "email is required.")
	}

	employee, err := h.svc.UpdateEmployee(c.Context(), c.Params("id"), core.UpdateEmployeeRequest{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Name:      req.Name,
		Email:     req.Email,
	})
	if err != nil {
		return writeEmployeeError(c, err)
	}
	return writeData(c, fiber.StatusOK, employee)
}

func (h *EmployeeHandler) Delete(c fiber.Ctx) error {
	if err := h.svc.DeleteEmployee(c.Context(), c.Params("id")); err != nil {
		return writeEmployeeError(c, err)
	}
	return writeData(c, fiber.StatusOK, fiber.Map{"deleted": true})
}

func (h *EmployeeHandler) UpdateStatus(c fiber.Ctx) error {
	var req struct {
		Status string `json:"status" validate:"required"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}
	if err := h.validate.Struct(req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "status is required.")
	}

	employee, err := h.svc.UpdateEmployeeStatus(c.Context(), c.Params("id"), req.Status)
	if err != nil {
		return writeEmployeeError(c, err)
	}
	return writeData(c, fiber.StatusOK, employee)
}

func (h *EmployeeHandler) UpdateRole(c fiber.Ctx) error {
	var req struct {
		Role string `json:"role" validate:"required"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}
	if err := h.validate.Struct(req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "role is required.")
	}

	employee, err := h.svc.UpdateEmployeeRole(c.Context(), c.Params("id"), req.Role)
	if err != nil {
		return writeEmployeeError(c, err)
	}
	return writeData(c, fiber.StatusOK, employee)
}

func (h *EmployeeHandler) UpdateDepartment(c fiber.Ctx) error {
	var req struct {
		DepartmentID *string `json:"departmentId"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}

	employee, err := h.svc.UpdateEmployeeDepartment(c.Context(), c.Params("id"), req.DepartmentID)
	if err != nil {
		return writeEmployeeError(c, err)
	}
	return writeData(c, fiber.StatusOK, employee)
}

func writeEmployeeError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, core.ErrEmployeeNotFound):
		return writeError(c, fiber.StatusNotFound, "employee_not_found", "Employee not found.")
	case errors.Is(err, core.ErrEmployeeEmailConflict):
		return writeError(c, fiber.StatusConflict, "employee_email_conflict", "An employee with this email already exists.")
	case errors.Is(err, core.ErrEmployeeDepartmentInvalid):
		return writeError(c, fiber.StatusNotFound, "department_not_found", "Department not found.")
	case errors.Is(err, core.ErrInvalidEmployeeRole):
		return writeError(c, fiber.StatusBadRequest, "invalid_role", "Role is invalid.")
	case errors.Is(err, core.ErrInvalidEmployeeStatus):
		return writeError(c, fiber.StatusBadRequest, "invalid_status", "Status is invalid.")
	case errors.Is(err, core.ErrInvalidInput):
		return writeError(c, fiber.StatusBadRequest, "invalid_input", err.Error())
	default:
		return writeError(c, fiber.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
	}
}
