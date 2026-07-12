package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// successResponse wraps any data value in {"data": ...}.
type successResponse struct {
	Data any `json:"data"`
}

// errorDetail is the inner object within {"error": {...}}.
type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// errorResponse is {"error": {...}}.
type errorResponse struct {
	Error errorDetail `json:"error"`
}

// writeJSON encodes v as JSON and writes it with the given status code.
// Content-Type is set to application/json.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("response encode error", "err", err)
	}
}

// writeData wraps v in {"data": v} and writes it.
func writeData(w http.ResponseWriter, status int, v any) {
	writeJSON(w, status, successResponse{Data: v})
}

// writeError writes {"error": {"code": code, "message": msg}}.
func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, errorResponse{Error: errorDetail{Code: code, Message: msg}})
}
