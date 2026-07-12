package api

import (
	"github.com/gofiber/fiber/v3"
)

// RouterDeps holds all dependencies required to construct the router.
// Passing deps explicitly keeps the router testable without a live server.
type RouterDeps struct {
	DepartmentHandler *DepartmentHandler
}

// RegisterRoutes registers the API routes on the provided fiber Router.
func RegisterRoutes(r fiber.Router, deps RouterDeps) {
	// ── API v1 (Admin-only) ──────────────────────────────────────────────────
	v1 := r.Group("/api/v1")
	v1.Use(RequireAdmin)

	departments := v1.Group("/departments")
	h := deps.DepartmentHandler
	departments.Post("/", h.Create)
	departments.Get("/", h.List)
	departments.Get("/:id", h.Get)
	departments.Patch("/:id", h.Update)
	departments.Patch("/:id/status", h.UpdateStatus)
}
