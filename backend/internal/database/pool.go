// Package database provides pgxpool initialization for AssetFlow.
package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Options configures the connection pool.
type Options struct {
	DSN            string
	MinConns       int32
	MaxConns       int32
	ConnectTimeout time.Duration
}

// NewPool creates and validates a pgxpool.Pool.
// The caller is responsible for calling pool.Close() when done.
// The DSN is never logged.
func NewPool(ctx context.Context, opts Options) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(opts.DSN)
	if err != nil {
		return nil, fmt.Errorf("invalid database URL: %w", err)
	}

	cfg.MinConns = opts.MinConns
	cfg.MaxConns = opts.MaxConns
	cfg.ConnConfig.ConnectTimeout = opts.ConnectTimeout

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, opts.ConnectTimeout)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	return pool, nil
}
