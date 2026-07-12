package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/HarshalHarne/assetflow/internal/api"
	"github.com/HarshalHarne/assetflow/internal/config"
	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/HarshalHarne/assetflow/internal/database"
	"github.com/HarshalHarne/assetflow/internal/db"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	// ── 1. Load configuration ────────────────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("configuration error: %w", err)
	}

	// ── 2. Create signal context (graceful shutdown) ──────────────────────────
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// ── 3. Connect to database ───────────────────────────────────────────────
	pool, err := database.NewPool(ctx, database.Options{
		DSN:            cfg.DatabaseURL,
		MinConns:       cfg.DatabaseMinConns,
		MaxConns:       cfg.DatabaseMaxConns,
		ConnectTimeout: cfg.DatabaseConnectTimeout,
	})
	if err != nil {
		return fmt.Errorf("database connection error: %w", err)
	}
	defer pool.Close()
	slog.Info("database connected")

	// ── 4. Wire application layers ───────────────────────────────────────────
	queries := db.New(pool)
	deptService := core.NewDepartmentService(queries)
	deptHandler := api.NewDepartmentHandler(deptService)

	router := api.NewRouter(api.RouterDeps{
		DepartmentHandler: deptHandler,
		RequestTimeout:    cfg.HTTPRequestTimeout,
	})

	// ── 5. Start HTTP server ─────────────────────────────────────────────────
	srv := &http.Server{
		Addr:    ":" + cfg.HTTPPort,
		Handler: router,
	}

	serverErr := make(chan error, 1)
	go func() {
		slog.Info("server listening", "port", cfg.HTTPPort)
		serverErr <- srv.ListenAndServe()
	}()

	// ── 6. Wait for shutdown signal or server error ──────────────────────────
	select {
	case err := <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("server error: %w", err)
		}
	case <-ctx.Done():
		stop() // release signal resources
		slog.Info("shutdown signal received")
	}

	// ── 7. Graceful shutdown ─────────────────────────────────────────────────
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.HTTPShutdownTimeout)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown error: %w", err)
	}

	slog.Info("server stopped cleanly")
	return nil
}
