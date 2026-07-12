package core

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/HarshalHarne/assetflow/internal/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmployeeNotFound          = errors.New("employee not found")
	ErrEmployeeEmailConflict     = errors.New("employee email already exists")
	ErrEmployeeDepartmentInvalid = errors.New("department not found")
	ErrInvalidEmployeeRole       = errors.New("invalid employee role")
	ErrInvalidEmployeeStatus     = errors.New("invalid employee status")
)

type EmployeeServicer interface {
	ListEmployees(ctx context.Context) ([]Employee, error)
	CreateEmployee(ctx context.Context, req CreateEmployeeRequest) (Employee, error)
	UpdateEmployee(ctx context.Context, id string, req UpdateEmployeeRequest) (Employee, error)
	UpdateEmployeeStatus(ctx context.Context, id string, status string) (Employee, error)
	UpdateEmployeeRole(ctx context.Context, id string, role string) (Employee, error)
	UpdateEmployeeDepartment(ctx context.Context, id string, departmentID *string) (Employee, error)
	DeleteEmployee(ctx context.Context, id string) error
}

type EmployeeStore interface {
	CreateEmployee(ctx context.Context, arg db.CreateEmployeeParams) (db.Employee, error)
	DeleteEmployee(ctx context.Context, id pgtype.UUID) error
	EmployeeEmailExists(ctx context.Context, email string) (bool, error)
	EmployeeEmailExistsExcludingID(ctx context.Context, arg db.EmployeeEmailExistsExcludingIDParams) (bool, error)
	GetEmployeeByID(ctx context.Context, id pgtype.UUID) (db.Employee, error)
	ListEmployees(ctx context.Context) ([]db.Employee, error)
	ParentDepartmentExists(ctx context.Context, parentID pgtype.UUID) (bool, error)
	UpdateEmployee(ctx context.Context, arg db.UpdateEmployeeParams) (db.Employee, error)
	UpdateEmployeeRole(ctx context.Context, arg db.UpdateEmployeeRoleParams) (db.Employee, error)
	UpdateEmployeeStatus(ctx context.Context, arg db.UpdateEmployeeStatusParams) (db.Employee, error)
	AssignDepartment(ctx context.Context, arg db.AssignDepartmentParams) (db.Employee, error)
}

type EmployeeService struct {
	store EmployeeStore
}

type Employee struct {
	ID           string    `json:"id"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	DepartmentID *string   `json:"departmentId"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreateEmployeeRequest struct {
	FirstName    string  `json:"firstName"`
	LastName     string  `json:"lastName"`
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	Password     string  `json:"password"`
	DepartmentID *string `json:"departmentId"`
	Role         string  `json:"role"`
	Status       string  `json:"status"`
}

type UpdateEmployeeRequest struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Name      string `json:"name"`
	Email     string `json:"email"`
}

func NewEmployeeService(store EmployeeStore) *EmployeeService {
	return &EmployeeService{store: store}
}

func (s *EmployeeService) ListEmployees(ctx context.Context) ([]Employee, error) {
	rows, err := s.store.ListEmployees(ctx)
	if err != nil {
		return nil, mapEmployeeDBError(err)
	}

	result := make([]Employee, 0, len(rows))
	for _, row := range rows {
		result = append(result, employeeToCore(row))
	}
	return result, nil
}

func (s *EmployeeService) CreateEmployee(ctx context.Context, req CreateEmployeeRequest) (Employee, error) {
	firstName, lastName, err := resolveEmployeeNames(req.FirstName, req.LastName, req.Name)
	if err != nil {
		return Employee{}, err
	}

	email := normalizeEmail(req.Email)
	if email == "" {
		return Employee{}, fmt.Errorf("%w: email must not be blank", ErrInvalidInput)
	}
	if strings.TrimSpace(req.Password) == "" {
		return Employee{}, fmt.Errorf("%w: password must not be blank", ErrInvalidInput)
	}

	role, err := normalizeEmployeeRole(req.Role)
	if err != nil {
		return Employee{}, err
	}

	status, err := normalizeEmployeeStatus(req.Status)
	if err != nil {
		return Employee{}, err
	}

	exists, err := s.store.EmployeeEmailExists(ctx, email)
	if err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}
	if exists {
		return Employee{}, ErrEmployeeEmailConflict
	}

	departmentID, err := resolveDepartmentID(ctx, s.store, req.DepartmentID)
	if err != nil {
		return Employee{}, err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return Employee{}, err
	}

	row, err := s.store.CreateEmployee(ctx, db.CreateEmployeeParams{
		FirstName:    firstName,
		LastName:     lastName,
		Email:        email,
		PasswordHash: string(passwordHash),
		DepartmentID: departmentID,
		Role:         role,
		Status:       status,
	})
	if err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}

	return employeeToCore(row), nil
}

func (s *EmployeeService) UpdateEmployee(ctx context.Context, id string, req UpdateEmployeeRequest) (Employee, error) {
	uid, err := parseUUID(id)
	if err != nil {
		return Employee{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	if _, err := s.store.GetEmployeeByID(ctx, uid); err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}

	firstName, lastName, err := resolveEmployeeNames(req.FirstName, req.LastName, req.Name)
	if err != nil {
		return Employee{}, err
	}

	email := normalizeEmail(req.Email)
	if email == "" {
		return Employee{}, fmt.Errorf("%w: email must not be blank", ErrInvalidInput)
	}

	conflict, err := s.store.EmployeeEmailExistsExcludingID(ctx, db.EmployeeEmailExistsExcludingIDParams{
		Email: email,
		ID:    uid,
	})
	if err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}
	if conflict {
		return Employee{}, ErrEmployeeEmailConflict
	}

	row, err := s.store.UpdateEmployee(ctx, db.UpdateEmployeeParams{
		FirstName: firstName,
		LastName:  lastName,
		Email:     email,
		ID:        uid,
	})
	if err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}

	return employeeToCore(row), nil
}

func (s *EmployeeService) UpdateEmployeeStatus(ctx context.Context, id string, status string) (Employee, error) {
	uid, err := parseUUID(id)
	if err != nil {
		return Employee{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	normalizedStatus, err := normalizeEmployeeStatus(status)
	if err != nil {
		return Employee{}, err
	}

	row, err := s.store.UpdateEmployeeStatus(ctx, db.UpdateEmployeeStatusParams{
		Status: normalizedStatus,
		ID:     uid,
	})
	if err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}

	return employeeToCore(row), nil
}

func (s *EmployeeService) UpdateEmployeeRole(ctx context.Context, id string, role string) (Employee, error) {
	uid, err := parseUUID(id)
	if err != nil {
		return Employee{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	normalizedRole, err := normalizeEmployeeRole(role)
	if err != nil {
		return Employee{}, err
	}

	row, err := s.store.UpdateEmployeeRole(ctx, db.UpdateEmployeeRoleParams{
		Role: normalizedRole,
		ID:   uid,
	})
	if err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}

	return employeeToCore(row), nil
}

func (s *EmployeeService) UpdateEmployeeDepartment(ctx context.Context, id string, departmentID *string) (Employee, error) {
	uid, err := parseUUID(id)
	if err != nil {
		return Employee{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	resolvedDepartmentID, err := resolveDepartmentID(ctx, s.store, departmentID)
	if err != nil {
		return Employee{}, err
	}

	row, err := s.store.AssignDepartment(ctx, db.AssignDepartmentParams{
		DepartmentID: resolvedDepartmentID,
		ID:           uid,
	})
	if err != nil {
		return Employee{}, mapEmployeeDBError(err)
	}

	return employeeToCore(row), nil
}

func (s *EmployeeService) DeleteEmployee(ctx context.Context, id string) error {
	uid, err := parseUUID(id)
	if err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	if _, err := s.store.GetEmployeeByID(ctx, uid); err != nil {
		return mapEmployeeDBError(err)
	}

	if err := s.store.DeleteEmployee(ctx, uid); err != nil {
		return mapEmployeeDBError(err)
	}

	return nil
}

func resolveEmployeeNames(firstName, lastName, name string) (string, string, error) {
	firstName = strings.TrimSpace(firstName)
	lastName = strings.TrimSpace(lastName)
	name = strings.TrimSpace(name)

	if firstName != "" && lastName != "" {
		return firstName, lastName, nil
	}

	if name == "" {
		return "", "", fmt.Errorf("%w: firstName and lastName are required", ErrInvalidInput)
	}

	parts := strings.Fields(name)
	if len(parts) < 2 {
		return "", "", fmt.Errorf("%w: name must include first and last name", ErrInvalidInput)
	}

	return parts[0], strings.Join(parts[1:], " "), nil
}

func resolveDepartmentID(ctx context.Context, store EmployeeStore, departmentID *string) (pgtype.UUID, error) {
	if departmentID == nil || strings.TrimSpace(*departmentID) == "" {
		return pgtype.UUID{Valid: false}, nil
	}

	uid, err := parseUUID(strings.TrimSpace(*departmentID))
	if err != nil {
		return pgtype.UUID{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	exists, err := store.ParentDepartmentExists(ctx, uid)
	if err != nil {
		return pgtype.UUID{}, mapEmployeeDBError(err)
	}
	if !exists {
		return pgtype.UUID{}, ErrEmployeeDepartmentInvalid
	}

	return uid, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeEmployeeRole(role string) (db.EmployeeRole, error) {
	if strings.TrimSpace(role) == "" {
		return db.EmployeeRoleEmployee, nil
	}

	value := db.EmployeeRole(strings.TrimSpace(role))
	if !value.Valid() {
		return "", ErrInvalidEmployeeRole
	}
	return value, nil
}

func normalizeEmployeeStatus(status string) (db.EmployeeStatus, error) {
	if strings.TrimSpace(status) == "" {
		return db.EmployeeStatusActive, nil
	}

	value := db.EmployeeStatus(strings.TrimSpace(status))
	if !value.Valid() {
		return "", ErrInvalidEmployeeStatus
	}
	return value, nil
}

func employeeToCore(row db.Employee) Employee {
	result := Employee{
		ID:        uuidToString(row.ID),
		FirstName: row.FirstName,
		LastName:  row.LastName,
		Name:      strings.TrimSpace(row.FirstName + " " + row.LastName),
		Email:     row.Email,
		Role:      string(row.Role),
		Status:    string(row.Status),
		CreatedAt: pgTimestampToTime(row.CreatedAt),
		UpdatedAt: pgTimestampToTime(row.UpdatedAt),
	}

	if row.DepartmentID.Valid {
		departmentID := uuidToString(row.DepartmentID)
		result.DepartmentID = &departmentID
	}

	return result
}

func mapEmployeeDBError(err error) error {
	if err == nil {
		return nil
	}

	if isNoRows(err) {
		return ErrEmployeeNotFound
	}

	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return err
	}

	switch pgErr.Code {
	case "23505":
		return ErrEmployeeEmailConflict
	case "23503":
		return ErrEmployeeDepartmentInvalid
	}

	return err
}

func isNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
