// Package logger configures a structured slog logger for the application.
// All handlers write JSON to stdout so log aggregators (Loki, CloudWatch) can ingest directly.
package logger

import (
	"log/slog"
	"os"
)

// New returns a JSON-formatted slog.Logger writing to stdout.
// In development the level is Debug; in production callers should wrap with
// slog.SetDefault after confirming the LOG_LEVEL env var if needed.
func New() *slog.Logger {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	return slog.New(handler)
}
