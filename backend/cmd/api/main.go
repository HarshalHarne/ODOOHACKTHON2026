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

	"github.com/HarshalHarne/assetflow/internal/api"
	"github.com/HarshalHarne/assetflow/internal/config"
	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/HarshalHarne/assetflow/internal/db"
	applogger "github.com/HarshalHarne/assetflow/internal/logger"
)

func main() {
	log := applogger.New()

	cfg, err := config.Load()
	if err != nil {
		log.Error("failed to load configuration", slog.String("error", err.Error()))
		os.Exit(1)
	}

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

	if err := pool.Ping(context.Background()); err != nil {
		log.Error("database ping failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
	log.Info("database connection established")

	queries := db.New(pool)
	authService := core.NewAuthService(queries, cfg.JWTSecret, cfg.JWTExpiry)
	departmentService := core.NewDepartmentService(queries).WithExecutor(pool)
	employeeService := core.NewEmployeeService(queries)
	categoryService := core.NewCategoryService(queries).WithExecutor(pool)

	authHandler := api.NewAuthHandler(authService)
	departmentHandler := api.NewDepartmentHandler(departmentService)
	employeeHandler := api.NewEmployeeHandler(employeeService)
	categoryHandler := api.NewCategoryHandler(categoryService)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			var fiberErr *fiber.Error
			if errors.As(err, &fiberErr) {
				code = fiberErr.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path}\n",
	}))
	app.Use(cors.New())
	app.Use(helmet.New())
	app.Use(compress.New())
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: time.Minute,
	}))

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api.RegisterRoutes(app, api.RouterDeps{
		AuthHandler:       authHandler,
		DepartmentHandler: departmentHandler,
		EmployeeHandler:   employeeHandler,
		CategoryHandler:   categoryHandler,
		JWTSecret:         cfg.JWTSecret,
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Info("starting server", slog.String("addr", addr))

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
