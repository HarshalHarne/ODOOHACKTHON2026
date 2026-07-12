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
	"context"
	"net/http"
)

// Role identifies a user's role within the application.
type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

// Principal represents an authenticated caller.
// Authenticated must be true and Role must be RoleAdmin for Admin routes.
type Principal struct {
	UserID        string
	Role          Role
	Authenticated bool
}

type contextKey string

const principalKey contextKey = "principal"

// SetPrincipal stores a Principal in the context.
// Call this from auth middleware or from tests.
func SetPrincipal(ctx context.Context, p Principal) context.Context {
	return context.WithValue(ctx, principalKey, p)
}

// GetPrincipal retrieves the Principal from the context.
// Returns the Principal and true if present; zero value and false otherwise.
func GetPrincipal(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey).(Principal)
	return p, ok
}

// RequireAdmin is a chi middleware that enforces Admin-only access.
//
//   - No principal in context           → 401 Unauthorized
//   - Unauthenticated principal         → 401 Unauthorized
//   - Authenticated principal, non-admin → 403 Forbidden
//   - Authenticated Admin               → continues
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, ok := GetPrincipal(r.Context())
		if !ok || !p.Authenticated {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication is required.")
			return
		}
		if p.Role != RoleAdmin {
			writeError(w, http.StatusForbidden, "forbidden", "Admin role is required.")
			return
		}
		next.ServeHTTP(w, r)
	})
}
