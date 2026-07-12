// Package core contains the Department domain types, request/response models,
// and the optional-nullable UUID helper used for PATCH semantics.
package core

import (
	"encoding/json"
	"fmt"
	"time"
)

// ── Domain response ───────────────────────────────────────────────────────────

// Department is the canonical API response for a department.
type Department struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Code       string    `json:"code"`
	ParentID   *string   `json:"parentId"`
	ParentName *string   `json:"parentName"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// ── Create request ────────────────────────────────────────────────────────────

// CreateDepartmentRequest is the request body for POST /api/v1/departments.
type CreateDepartmentRequest struct {
	Name     string  `json:"name"`
	Code     string  `json:"code"`
	ParentID *string `json:"parentId"`
}

// ── Update request ────────────────────────────────────────────────────────────

// OptionalNullableUUID distinguishes three states in a PATCH request:
//   - field absent from JSON  → Present=false (preserve current value)
//   - field present as null   → Present=true,  Value=nil (clear the value)
//   - field present as string → Present=true,  Value=&uuid (set new value)
type OptionalNullableUUID struct {
	Value   *string
	Present bool
}

func (o *OptionalNullableUUID) UnmarshalJSON(data []byte) error {
	o.Present = true
	if string(data) == "null" {
		o.Value = nil
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return fmt.Errorf("parentId must be a UUID string or null: %w", err)
	}
	o.Value = &s
	return nil
}

// UpdateDepartmentRequest is the request body for PATCH /api/v1/departments/{id}.
// All fields are optional; only supplied fields are merged.
type UpdateDepartmentRequest struct {
	Name     *string              `json:"name"`
	Code     *string              `json:"code"`
	ParentID OptionalNullableUUID `json:"parentId"`
}

// ── Status request ────────────────────────────────────────────────────────────

// UpdateDepartmentStatusRequest is the request body for
// PATCH /api/v1/departments/{id}/status.
type UpdateDepartmentStatusRequest struct {
	Status string `json:"status"`
}
