package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   time.Duration
}

func Load() (*Config, error) {
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

	jwtExpiryHours := 24
	if raw := os.Getenv("JWT_EXPIRY_HOURS"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value <= 0 {
			return nil, fmt.Errorf("config: JWT_EXPIRY_HOURS must be a positive integer")
		}
		jwtExpiryHours = value
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		JWTExpiry:   time.Duration(jwtExpiryHours) * time.Hour,
	}, nil
}
