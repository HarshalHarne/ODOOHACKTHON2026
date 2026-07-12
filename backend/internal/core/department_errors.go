package core

import "errors"

// Stable domain errors for the Department service.
// Handlers map these to appropriate HTTP status codes.
var (
	ErrDepartmentNotFound         = errors.New("department not found")
	ErrParentDepartmentNotFound   = errors.New("parent department not found")
	ErrDepartmentNameConflict     = errors.New("a department with this name already exists")
	ErrDepartmentCodeConflict     = errors.New("a department with this code already exists")
	ErrInvalidDepartmentHierarchy = errors.New("this change would create a cycle or invalid hierarchy")
	ErrInvalidDepartmentStatus    = errors.New("status must be 'active' or 'inactive'")
	ErrInvalidInput               = errors.New("invalid input")
)
