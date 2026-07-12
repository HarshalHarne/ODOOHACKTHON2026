package api

import (
	"errors"

	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
)

type AuthHandler struct {
	svc      core.AuthServicer
	validate *validator.Validate
}

func NewAuthHandler(svc core.AuthServicer) *AuthHandler {
	return &AuthHandler{
		svc:      svc,
		validate: validator.New(),
	}
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req struct {
		Email    string `json:"email" validate:"required,email"`
		Password string `json:"password" validate:"required"`
	}
	if err := decodeBody(c, &req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", err.Error())
	}
	if err := h.validate.Struct(req); err != nil {
		return writeError(c, fiber.StatusBadRequest, "invalid_request", "email and password are required.")
	}

	result, err := h.svc.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, core.ErrInvalidCredentials):
			return writeError(c, fiber.StatusUnauthorized, "invalid_credentials", "Invalid email or password.")
		case errors.Is(err, core.ErrInactiveEmployee):
			return writeError(c, fiber.StatusForbidden, "inactive_employee", "Employee account is inactive.")
		default:
			return writeError(c, fiber.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
		}
	}

	return writeData(c, fiber.StatusOK, result)
}
