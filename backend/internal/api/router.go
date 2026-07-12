package api

import (
	"github.com/gofiber/fiber/v3"
)

type RouterDeps struct {
	AuthHandler       *AuthHandler
	DepartmentHandler *DepartmentHandler
	EmployeeHandler   *EmployeeHandler
	CategoryHandler   *CategoryHandler
	JWTSecret         string
}

func RegisterRoutes(r fiber.Router, deps RouterDeps) {
	v1 := r.Group("/api/v1")

	auth := v1.Group("/auth")
	auth.Post("/login", deps.AuthHandler.Login)

	jwtMid := JWTMiddleware(deps.JWTSecret)

	departments := v1.Group("/departments", jwtMid, RequireAdmin)
	departments.Post("/", deps.DepartmentHandler.Create)
	departments.Get("/", deps.DepartmentHandler.List)
	departments.Get("/:id", deps.DepartmentHandler.Get)
	departments.Put("/:id", deps.DepartmentHandler.Replace)
	departments.Patch("/:id", deps.DepartmentHandler.Update)
	departments.Patch("/:id/status", deps.DepartmentHandler.UpdateStatus)
	departments.Delete("/:id", deps.DepartmentHandler.Delete)

	employees := v1.Group("/employees", jwtMid, RequireAdmin)
	employees.Get("/", deps.EmployeeHandler.List)
	employees.Post("/", deps.EmployeeHandler.Create)
	employees.Put("/:id", deps.EmployeeHandler.Replace)
	employees.Delete("/:id", deps.EmployeeHandler.Delete)
	employees.Patch("/:id/status", deps.EmployeeHandler.UpdateStatus)
	employees.Patch("/:id/role", deps.EmployeeHandler.UpdateRole)
	employees.Patch("/:id/department", deps.EmployeeHandler.UpdateDepartment)

	categories := v1.Group("/categories", jwtMid, RequireAdmin)
	categories.Get("/", deps.CategoryHandler.List)
	categories.Post("/", deps.CategoryHandler.Create)
	categories.Put("/:id", deps.CategoryHandler.Replace)
	categories.Delete("/:id", deps.CategoryHandler.Delete)
}
