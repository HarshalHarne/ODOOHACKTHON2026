package api

import (
	"github.com/gofiber/fiber/v3"
)

// successResponse wraps any data value in {"data": ...}.
type successResponse struct {
	Data any `json:"data"`
}

// errorDetail is the inner object within {"error": {...}}.
type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// errorResponse is {"error": {...}}.
type errorResponse struct {
	Error errorDetail `json:"error"`
}

// writeData wraps v in {"data": v} and writes it.
func writeData(c fiber.Ctx, status int, v any) error {
	return c.Status(status).JSON(successResponse{Data: v})
}

// writeError writes {"error": {"code": code, "message": msg}}.
func writeError(c fiber.Ctx, status int, code, msg string) error {
	return c.Status(status).JSON(errorResponse{Error: errorDetail{Code: code, Message: msg}})
}
