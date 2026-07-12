package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/HarshalHarne/assetflow/internal/config"
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
	
	// Create an admin user
	ctx := context.Background()
	
	email := "admin@assetflow.com"
	password := "admin123"
	
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Error("failed to hash password", slog.String("error", err.Error()))
		os.Exit(1)
	}
	
	// Check if admin exists
	_, err = queries.GetEmployeeByEmail(ctx, email)
	if err == nil {
		log.Info("Admin user already exists")
		return
	}
	
	deptParams := db.CreateDepartmentParams{
		Name: "Administration",
		Code: "ADM",
		// ParentID is left invalid (NULL) by default since we don't set it
	}
	
	dept, err := queries.CreateDepartment(ctx, deptParams)
	if err != nil {
		log.Error("failed to create department", slog.String("error", err.Error()))
		// Proceed anyway, we can create employee without department if allowed
	}
	
	empParams := db.CreateEmployeeParams{
		FirstName:    "Admin",
		LastName:     "User",
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         db.EmployeeRoleAdmin,
		Status:       db.EmployeeStatusActive,
	}
	
	// Set departmentId if it was created successfully
	if err == nil {
		empParams.DepartmentID = dept.ID
	}
	
	_, err = queries.CreateEmployee(ctx, empParams)
	if err != nil {
		log.Error("failed to create admin user", slog.String("error", err.Error()))
		os.Exit(1)
	}
	
	fmt.Printf("Successfully seeded admin account!\nEmail: %s\nPassword: %s\n", email, password)
}
