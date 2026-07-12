// Package config loads and validates application configuration from environment variables.
// No secrets are printed or logged.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds the complete application configuration.
type Config struct {
	HTTPPort               string
	DatabaseURL            string
	DatabaseMinConns       int32
	DatabaseMaxConns       int32
	DatabaseConnectTimeout time.Duration
	HTTPRequestTimeout     time.Duration
	HTTPShutdownTimeout    time.Duration
}

// Load reads configuration from environment variables and returns a validated Config.
// DATABASE_URL is required. All other values fall back to safe defaults.
func Load() (*Config, error) {
	cfg := &Config{}

	// HTTP_PORT
	cfg.HTTPPort = envString("HTTP_PORT", "8080")

	// DATABASE_URL — required
	cfg.DatabaseURL = os.Getenv("DATABASE_URL")
	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL environment variable is required")
	}

	// DATABASE_MIN_CONNS
	minConns, err := envInt32("DATABASE_MIN_CONNS", 2)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_MIN_CONNS: %w", err)
	}
	cfg.DatabaseMinConns = minConns

	// DATABASE_MAX_CONNS
	maxConns, err := envInt32("DATABASE_MAX_CONNS", 10)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_MAX_CONNS: %w", err)
	}
	cfg.DatabaseMaxConns = maxConns

	if cfg.DatabaseMinConns > cfg.DatabaseMaxConns {
		return nil, fmt.Errorf(
			"DATABASE_MIN_CONNS (%d) cannot exceed DATABASE_MAX_CONNS (%d)",
			cfg.DatabaseMinConns, cfg.DatabaseMaxConns,
		)
	}

	// DATABASE_CONNECT_TIMEOUT
	connectTimeout, err := envDuration("DATABASE_CONNECT_TIMEOUT", 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_CONNECT_TIMEOUT: %w", err)
	}
	cfg.DatabaseConnectTimeout = connectTimeout

	// HTTP_REQUEST_TIMEOUT
	reqTimeout, err := envDuration("HTTP_REQUEST_TIMEOUT", 30*time.Second)
	if err != nil {
		return nil, fmt.Errorf("HTTP_REQUEST_TIMEOUT: %w", err)
	}
	cfg.HTTPRequestTimeout = reqTimeout

	// HTTP_SHUTDOWN_TIMEOUT
	shutdownTimeout, err := envDuration("HTTP_SHUTDOWN_TIMEOUT", 15*time.Second)
	if err != nil {
		return nil, fmt.Errorf("HTTP_SHUTDOWN_TIMEOUT: %w", err)
	}
	cfg.HTTPShutdownTimeout = shutdownTimeout

	return cfg, nil
}

func envString(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func envInt32(key string, defaultVal int32) (int32, error) {
	s := os.Getenv(key)
	if s == "" {
		return defaultVal, nil
	}
	v, err := strconv.ParseInt(s, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("invalid integer value %q: %w", s, err)
	}
	return int32(v), nil
}

func envDuration(key string, defaultVal time.Duration) (time.Duration, error) {
	s := os.Getenv(key)
	if s == "" {
		return defaultVal, nil
	}
	d, err := time.ParseDuration(s)
	if err != nil {
		return 0, fmt.Errorf("invalid duration value %q (use Go duration format, e.g. 10s, 1m): %w", s, err)
	}
	return d, nil
}
