// Package repository provides database access for the Employee domain.
// Each method delegates directly to the sqlc-generated Queries struct.
// No business logic lives here — that is the responsibility of the service layer.
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/HarshalHarne/assetflow/internal/db"
)

// EmployeeRepository exposes all employee database operations.
// It wraps the sqlc Querier to decouple the service layer from the generated package.
type EmployeeRepository struct {
	q db.Querier
}

// NewEmployeeRepository constructs an EmployeeRepository backed by the given Querier.
// Pass db.New(pool) at the call site in main.go.
func NewEmployeeRepository(q db.Querier) *EmployeeRepository {
	return &EmployeeRepository{q: q}
}

func (r *EmployeeRepository) Create(ctx context.Context, arg db.CreateEmployeeParams) (db.Employee, error) {
	return r.q.CreateEmployee(ctx, arg)
}

func (r *EmployeeRepository) GetByID(ctx context.Context, id uuid.UUID) (db.Employee, error) {
	return r.q.GetEmployeeByID(ctx, id)
}

func (r *EmployeeRepository) GetByEmail(ctx context.Context, email string) (db.Employee, error) {
	return r.q.GetEmployeeByEmail(ctx, email)
}

func (r *EmployeeRepository) List(ctx context.Context) ([]db.Employee, error) {
	return r.q.ListEmployees(ctx)
}

// ListByDepartment accepts pgtype.UUID because that is the type sqlc emits for nullable
// UUID foreign key parameters when using the pgx/v5 sql_package.
func (r *EmployeeRepository) ListByDepartment(ctx context.Context, departmentID pgtype.UUID) ([]db.Employee, error) {
	return r.q.ListEmployeesByDepartment(ctx, departmentID)
}

func (r *EmployeeRepository) ListByStatus(ctx context.Context, status db.EmployeeStatus) ([]db.Employee, error) {
	return r.q.ListEmployeesByStatus(ctx, status)
}

func (r *EmployeeRepository) Update(ctx context.Context, arg db.UpdateEmployeeParams) (db.Employee, error) {
	return r.q.UpdateEmployee(ctx, arg)
}

func (r *EmployeeRepository) UpdateStatus(ctx context.Context, arg db.UpdateEmployeeStatusParams) (db.Employee, error) {
	return r.q.UpdateEmployeeStatus(ctx, arg)
}

func (r *EmployeeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteEmployee(ctx, id)
}

func (r *EmployeeRepository) Count(ctx context.Context) (int64, error) {
	return r.q.CountEmployees(ctx)
}

func (r *EmployeeRepository) CountByStatus(ctx context.Context, status db.EmployeeStatus) (int64, error) {
	return r.q.CountEmployeesByStatus(ctx, status)
}
