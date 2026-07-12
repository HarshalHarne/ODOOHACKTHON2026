// Package api implements the HTTP layer for AssetFlow.
//
// Authorization seam:
//
// This package defines a Principal type and a RequireAdmin middleware.
// In production, a future Supabase Auth middleware will verify the JWT token,
// decode claims, and call SetPrincipal to inject a Principal into the request
// context before RequireAdmin sees the request.
//
// Until that middleware is implemented, all Department routes return 401 for
// every request because no Principal is ever injected.
//
// DO NOT add X-Role headers, development bypasses, or hard-coded admins.
package api

import (
	"github.com/gofiber/fiber/v3"
)

// Role identifies a user's role within the application.
type Role string

const (
	RoleAdmin          Role = "admin"
	RoleAssetManager   Role = "asset_manager"
	RoleDepartmentHead Role = "department_head"
	RoleEmployee       Role = "employee"
)

// Principal represents an authenticated caller.
// Authenticated must be true and Role must be RoleAdmin for Admin routes.
type Principal struct {
	UserID        string
	Role          Role
	Authenticated bool
}

// SetPrincipal stores a Principal in the fiber Locals.
// Call this from auth middleware or from tests.
func SetPrincipal(c fiber.Ctx, p Principal) {
	c.Locals("principal", p)
}

// GetPrincipal retrieves the Principal from the fiber Locals.
// Returns the Principal and true if present; zero value and false otherwise.
func GetPrincipal(c fiber.Ctx) (Principal, bool) {
	p, ok := c.Locals("principal").(Principal)
	return p, ok
}

// RequireAdmin is a fiber middleware that enforces Admin-only access.
//
//   - No principal in context           → 401 Unauthorized
//   - Unauthenticated principal         → 401 Unauthorized
//   - Authenticated principal, non-admin → 403 Forbidden
//   - Authenticated Admin               → continues
func RequireAdmin(c fiber.Ctx) error {
	p, ok := GetPrincipal(c)
	if !ok || !p.Authenticated {
		return writeError(c, fiber.StatusUnauthorized, "unauthorized", "Authentication is required.")
	}
	if p.Role != RoleAdmin {
		return writeError(c, fiber.StatusForbidden, "forbidden", "Admin role is required.")
	}
	return c.Next()
}
