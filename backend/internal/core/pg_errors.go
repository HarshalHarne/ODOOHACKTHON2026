package core

import (
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// mapDBError translates low-level pgx/pgconn errors into stable domain errors.
// Database internals (SQL state, constraint names) are never passed to callers.
func mapDBError(err error) error {
	if err == nil {
		return nil
	}

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrDepartmentNotFound
	}

	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return err // unrecognized — caller treats as internal error
	}

	switch pgErr.Code {
	case "23505": // unique_violation
		switch pgErr.ConstraintName {
		case "departments_name_lower_idx":
			return ErrDepartmentNameConflict
		case "departments_code_upper_idx":
			return ErrDepartmentCodeConflict
		}
		return ErrInvalidInput

	case "23503": // foreign_key_violation
		if pgErr.ConstraintName == "departments_parent_id_fkey" {
			return ErrParentDepartmentNotFound
		}
		return ErrInvalidInput

	case "23514": // check_violation
		switch pgErr.ConstraintName {
		case "departments_parent_not_self":
			return ErrInvalidDepartmentHierarchy
		case "departments_name_not_blank":
			return ErrInvalidInput
		case "departments_code_not_blank":
			return ErrInvalidInput
		}
		return ErrInvalidInput

	case "P0001": // raise_exception — hierarchy cycle trigger
		return ErrInvalidDepartmentHierarchy
	}

	return err
}
