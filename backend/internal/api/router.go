package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// RouterDeps holds all dependencies required to construct the router.
// Passing deps explicitly keeps the router testable without a live server.
type RouterDeps struct {
	DepartmentHandler *DepartmentHandler
	RequestTimeout    time.Duration
}

// NewRouter constructs and returns the chi router with all routes registered.
func NewRouter(deps RouterDeps) http.Handler {
	r := chi.NewRouter()

	// ── Global middleware ────────────────────────────────────────────────────
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(deps.RequestTimeout))

	// ── Health check (public) ────────────────────────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// ── API v1 (Admin-only) ──────────────────────────────────────────────────
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(RequireAdmin)

		r.Route("/departments", func(r chi.Router) {
			h := deps.DepartmentHandler
			r.Post("/", h.Create)
			r.Get("/", h.List)
			r.Get("/{id}", h.Get)
			r.Patch("/{id}", h.Update)
			r.Patch("/{id}/status", h.UpdateStatus)
		})
	})

	return r
}
