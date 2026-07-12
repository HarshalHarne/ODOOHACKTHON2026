package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	fiberlogger "github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/HarshalHarne/assetflow/internal/config"
	applogger "github.com/HarshalHarne/assetflow/internal/logger"
)

func main() {
	log := applogger.New()

	cfg, err := config.Load()
	if err != nil {
		log.Error("failed to load configuration", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// pgxpool manages a connection pool over the pgx driver.
	// ParseConfig validates the DSN before any network connection is attempted.
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Error("invalid DATABASE_URL", slog.String("error", err.Error()))
		os.Exit(1)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), poolCfg)
	if err != nil {
		log.Error("failed to create pgxpool", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer pool.Close()

	// Verify connectivity at startup so misconfiguration fails fast.
	if err := pool.Ping(context.Background()); err != nil {
		log.Error("database ping failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
	log.Info("database connection established")

	app := fiber.New(fiber.Config{
		// Return structured JSON error bodies rather than HTML.
		ErrorHandler: func(c fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			var fiberErr *fiber.Error
			if errors.As(err, &fiberErr) {
				code = fiberErr.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// --- Mandatory Fiber middleware (order matters) ---

	// Recover must be first so panics in downstream middleware are caught.
	app.Use(recover.New())

	app.Use(requestid.New())

	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path}\n",
	}))

	app.Use(cors.New())

	app.Use(helmet.New())

	app.Use(compress.New())

	// Rate-limit: 100 requests per minute per IP.
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Minute,
	}))

	// Health probe — no auth required.
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Route groups will be registered here by future handler packages.
	// e.g.: employee.RegisterRoutes(app, pool, cfg)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Info("starting server", slog.String("addr", addr))

	// Graceful shutdown: wait for SIGTERM / SIGINT then allow in-flight
	// requests up to 10 seconds before forcing close.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		if err := app.Listen(addr); err != nil {
			log.Error("server error", slog.String("error", err.Error()))
		}
	}()

	<-quit
	log.Info("shutdown signal received")

	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Error("graceful shutdown failed", slog.String("error", err.Error()))
	}

	log.Info("server stopped")
}
