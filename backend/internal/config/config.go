// Package config loads application configuration from environment variables.
// godotenv is used to populate the environment from .env before os.Getenv is called.
package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration for the API server.
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

// Load reads .env (if present) then builds Config from environment variables.
// Failing to find .env is non-fatal; the process environment is always checked.
func Load() (*Config, error) {
	// Best-effort .env load — production containers inject env directly.
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("config: DATABASE_URL is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("config: JWT_SECRET is required")
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
	}, nil
}
