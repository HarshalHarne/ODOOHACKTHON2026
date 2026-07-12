package core

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/HarshalHarne/assetflow/internal/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// ── Fake store ────────────────────────────────────────────────────────────────

// fakeDepartmentStore implements db.Querier for unit tests.
// Each field is a function so individual tests can configure exact behavior.
type fakeDepartmentStore struct {
	createDepartment              func(ctx context.Context, arg db.CreateDepartmentParams) (db.CreateDepartmentRow, error)
	getDepartmentByID             func(ctx context.Context, id pgtype.UUID) (db.GetDepartmentByIDRow, error)
	listDepartments               func(ctx context.Context) ([]db.ListDepartmentsRow, error)
	updateDepartment              func(ctx context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error)
	updateDepartmentStatus        func(ctx context.Context, arg db.UpdateDepartmentStatusParams) (db.UpdateDepartmentStatusRow, error)
	departmentNameExists          func(ctx context.Context, name string) (bool, error)
	departmentCodeExists          func(ctx context.Context, code string) (bool, error)
	departmentNameExistsExcluding func(ctx context.Context, arg db.DepartmentNameExistsExcludingIDParams) (bool, error)
	departmentCodeExistsExcluding func(ctx context.Context, arg db.DepartmentCodeExistsExcludingIDParams) (bool, error)
	parentDepartmentExists        func(ctx context.Context, parentID pgtype.UUID) (bool, error)
}

func (f *fakeDepartmentStore) CreateDepartment(ctx context.Context, arg db.CreateDepartmentParams) (db.CreateDepartmentRow, error) {
	if f.createDepartment != nil {
		return f.createDepartment(ctx, arg)
	}
	return db.CreateDepartmentRow{}, nil
}
func (f *fakeDepartmentStore) GetDepartmentByID(ctx context.Context, id pgtype.UUID) (db.GetDepartmentByIDRow, error) {
	if f.getDepartmentByID != nil {
		return f.getDepartmentByID(ctx, id)
	}
	return db.GetDepartmentByIDRow{}, pgx.ErrNoRows
}
func (f *fakeDepartmentStore) ListDepartments(ctx context.Context) ([]db.ListDepartmentsRow, error) {
	if f.listDepartments != nil {
		return f.listDepartments(ctx)
	}
	return nil, nil
}
func (f *fakeDepartmentStore) UpdateDepartment(ctx context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error) {
	if f.updateDepartment != nil {
		return f.updateDepartment(ctx, arg)
	}
	return db.UpdateDepartmentRow{}, nil
}
func (f *fakeDepartmentStore) UpdateDepartmentStatus(ctx context.Context, arg db.UpdateDepartmentStatusParams) (db.UpdateDepartmentStatusRow, error) {
	if f.updateDepartmentStatus != nil {
		return f.updateDepartmentStatus(ctx, arg)
	}
	return db.UpdateDepartmentStatusRow{}, nil
}
func (f *fakeDepartmentStore) DepartmentNameExists(ctx context.Context, name string) (bool, error) {
	if f.departmentNameExists != nil {
		return f.departmentNameExists(ctx, name)
	}
	return false, nil
}
func (f *fakeDepartmentStore) DepartmentCodeExists(ctx context.Context, code string) (bool, error) {
	if f.departmentCodeExists != nil {
		return f.departmentCodeExists(ctx, code)
	}
	return false, nil
}
func (f *fakeDepartmentStore) DepartmentNameExistsExcludingID(ctx context.Context, arg db.DepartmentNameExistsExcludingIDParams) (bool, error) {
	if f.departmentNameExistsExcluding != nil {
		return f.departmentNameExistsExcluding(ctx, arg)
	}
	return false, nil
}
func (f *fakeDepartmentStore) DepartmentCodeExistsExcludingID(ctx context.Context, arg db.DepartmentCodeExistsExcludingIDParams) (bool, error) {
	if f.departmentCodeExistsExcluding != nil {
		return f.departmentCodeExistsExcluding(ctx, arg)
	}
	return false, nil
}
func (f *fakeDepartmentStore) ParentDepartmentExists(ctx context.Context, parentID pgtype.UUID) (bool, error) {
	if f.parentDepartmentExists != nil {
		return f.parentDepartmentExists(ctx, parentID)
	}
	return false, nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const testUUID = "11111111-1111-1111-1111-111111111111"
const parentUUID = "22222222-2222-2222-2222-222222222222"

func mustUUID(s string) pgtype.UUID {
	u, err := parseUUID(s)
	if err != nil {
		panic(err)
	}
	return u
}

func makeCreateRow(name, code string) db.CreateDepartmentRow {
	return db.CreateDepartmentRow{
		ID:        mustUUID(testUUID),
		Name:      name,
		Code:      code,
		Status:    db.RecordStatusActive,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
}

func makeGetRow(id, name, code string) db.GetDepartmentByIDRow {
	return db.GetDepartmentByIDRow{
		ID:        mustUUID(id),
		Name:      name,
		Code:      code,
		Status:    db.RecordStatusActive,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
}

func makeUpdateRow(name, code string) db.UpdateDepartmentRow {
	return db.UpdateDepartmentRow{
		ID:        mustUUID(testUUID),
		Name:      name,
		Code:      code,
		Status:    db.RecordStatusActive,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
}

func makeUpdateStatusRow(status db.RecordStatus) db.UpdateDepartmentStatusRow {
	return db.UpdateDepartmentStatusRow{
		ID:        mustUUID(testUUID),
		Name:      "Engineering",
		Code:      "ENG",
		Status:    status,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
}

// ── Create tests ──────────────────────────────────────────────────────────────

func TestCreateDepartment_ValidRoot(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		createDepartment: func(_ context.Context, arg db.CreateDepartmentParams) (db.CreateDepartmentRow, error) {
			return makeCreateRow(arg.Name, arg.Code), nil
		},
	})
	d, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "Engineering", Code: "ENG"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Name != "Engineering" || d.Code != "ENG" {
		t.Errorf("unexpected values: %+v", d)
	}
	if d.ParentID != nil {
		t.Errorf("expected nil parentId, got %v", d.ParentID)
	}
}

func TestCreateDepartment_ValidChild(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		parentDepartmentExists: func(_ context.Context, _ pgtype.UUID) (bool, error) { return true, nil },
		createDepartment: func(_ context.Context, arg db.CreateDepartmentParams) (db.CreateDepartmentRow, error) {
			row := makeCreateRow(arg.Name, arg.Code)
			row.ParentID = mustUUID(parentUUID)
			return row, nil
		},
	})
	pid := parentUUID
	d, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "Backend", Code: "BE", ParentID: &pid})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.ParentID == nil {
		t.Error("expected non-nil parentId")
	}
}

func TestCreateDepartment_BlankName(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{})
	_, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "   ", Code: "ENG"})
	if !errors.Is(err, ErrInvalidInput) {
		t.Errorf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCreateDepartment_BlankCode(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{})
	_, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "Engineering", Code: ""})
	if !errors.Is(err, ErrInvalidInput) {
		t.Errorf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCreateDepartment_NameConflict(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		departmentNameExists: func(_ context.Context, _ string) (bool, error) { return true, nil },
	})
	_, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "Engineering", Code: "ENG"})
	if !errors.Is(err, ErrDepartmentNameConflict) {
		t.Errorf("expected ErrDepartmentNameConflict, got %v", err)
	}
}

func TestCreateDepartment_CodeConflict(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		departmentCodeExists: func(_ context.Context, _ string) (bool, error) { return true, nil },
	})
	_, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "Engineering", Code: "ENG"})
	if !errors.Is(err, ErrDepartmentCodeConflict) {
		t.Errorf("expected ErrDepartmentCodeConflict, got %v", err)
	}
}

func TestCreateDepartment_MissingParent(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		parentDepartmentExists: func(_ context.Context, _ pgtype.UUID) (bool, error) { return false, nil },
	})
	pid := parentUUID
	_, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "Backend", Code: "BE", ParentID: &pid})
	if !errors.Is(err, ErrParentDepartmentNotFound) {
		t.Errorf("expected ErrParentDepartmentNotFound, got %v", err)
	}
}

func TestCreateDepartment_Normalization(t *testing.T) {
	var gotName, gotCode string
	svc := NewDepartmentService(&fakeDepartmentStore{
		createDepartment: func(_ context.Context, arg db.CreateDepartmentParams) (db.CreateDepartmentRow, error) {
			gotName = arg.Name
			gotCode = arg.Code
			return makeCreateRow(arg.Name, arg.Code), nil
		},
	})
	_, err := svc.CreateDepartment(context.Background(), CreateDepartmentRequest{Name: "  Engineering  ", Code: " eng "})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotName != "Engineering" {
		t.Errorf("expected trimmed name 'Engineering', got %q", gotName)
	}
	if gotCode != "ENG" {
		t.Errorf("expected uppercased code 'ENG', got %q", gotCode)
	}
}

// ── Get tests ─────────────────────────────────────────────────────────────────

func TestGetDepartment_Found(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Engineering", "ENG"), nil
		},
	})
	d, err := svc.GetDepartment(context.Background(), testUUID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Name != "Engineering" {
		t.Errorf("unexpected name: %s", d.Name)
	}
}

func TestGetDepartment_NotFound(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return db.GetDepartmentByIDRow{}, pgx.ErrNoRows
		},
	})
	_, err := svc.GetDepartment(context.Background(), testUUID)
	if !errors.Is(err, ErrDepartmentNotFound) {
		t.Errorf("expected ErrDepartmentNotFound, got %v", err)
	}
}

// ── List tests ────────────────────────────────────────────────────────────────

func TestListDepartments_Results(t *testing.T) {
	rows := []db.ListDepartmentsRow{
		{ID: mustUUID(testUUID), Name: "Engineering", Code: "ENG", Status: db.RecordStatusActive,
			CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
			UpdatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true}},
	}
	svc := NewDepartmentService(&fakeDepartmentStore{
		listDepartments: func(_ context.Context) ([]db.ListDepartmentsRow, error) { return rows, nil },
	})
	results, err := svc.ListDepartments(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 result, got %d", len(results))
	}
}

func TestListDepartments_EmptyIsArray(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		listDepartments: func(_ context.Context) ([]db.ListDepartmentsRow, error) { return nil, nil },
	})
	results, err := svc.ListDepartments(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if results == nil {
		t.Error("expected empty slice, got nil")
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}

// ── Update tests ──────────────────────────────────────────────────────────────

func TestUpdateDepartment_UpdateName(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Engineering", "ENG"), nil
		},
		updateDepartment: func(_ context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error) {
			return makeUpdateRow(arg.Name, arg.Code), nil
		},
	})
	newName := "Software"
	d, err := svc.UpdateDepartment(context.Background(), testUUID, UpdateDepartmentRequest{Name: &newName})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Name != "Software" {
		t.Errorf("expected name 'Software', got %q", d.Name)
	}
}

func TestUpdateDepartment_PreserveOmittedFields(t *testing.T) {
	var calledWith db.UpdateDepartmentParams
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Engineering", "ENG"), nil
		},
		updateDepartment: func(_ context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error) {
			calledWith = arg
			return makeUpdateRow(arg.Name, arg.Code), nil
		},
	})
	// Empty request — preserve all
	_, err := svc.UpdateDepartment(context.Background(), testUUID, UpdateDepartmentRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calledWith.Name != "Engineering" || calledWith.Code != "ENG" {
		t.Errorf("expected preserved values, got name=%q code=%q", calledWith.Name, calledWith.Code)
	}
}

func TestUpdateDepartment_PreserveParentWhenOmitted(t *testing.T) {
	var calledWith db.UpdateDepartmentParams
	currentRow := makeGetRow(testUUID, "Engineering", "ENG")
	currentRow.ParentID = mustUUID(parentUUID)
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return currentRow, nil
		},
		updateDepartment: func(_ context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error) {
			calledWith = arg
			return makeUpdateRow(arg.Name, arg.Code), nil
		},
	})
	_, err := svc.UpdateDepartment(context.Background(), testUUID, UpdateDepartmentRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calledWith.ParentID != mustUUID(parentUUID) {
		t.Errorf("expected parent to be preserved, got %v", calledWith.ParentID)
	}
}

func TestUpdateDepartment_RemoveParentWithExplicitNull(t *testing.T) {
	var calledWith db.UpdateDepartmentParams
	currentRow := makeGetRow(testUUID, "Engineering", "ENG")
	currentRow.ParentID = mustUUID(parentUUID)
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return currentRow, nil
		},
		updateDepartment: func(_ context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error) {
			calledWith = arg
			return makeUpdateRow(arg.Name, arg.Code), nil
		},
	})
	req := UpdateDepartmentRequest{}
	req.ParentID.Present = true
	req.ParentID.Value = nil // explicitly null

	_, err := svc.UpdateDepartment(context.Background(), testUUID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calledWith.ParentID.Valid {
		t.Error("expected parentID to be cleared (Valid=false)")
	}
}

func TestUpdateDepartment_AssignValidParent(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Backend", "BE"), nil
		},
		parentDepartmentExists: func(_ context.Context, _ pgtype.UUID) (bool, error) { return true, nil },
		updateDepartment: func(_ context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error) {
			r := makeUpdateRow(arg.Name, arg.Code)
			r.ParentID = arg.ParentID
			return r, nil
		},
	})
	pid := parentUUID
	req := UpdateDepartmentRequest{}
	req.ParentID.Present = true
	req.ParentID.Value = &pid
	d, err := svc.UpdateDepartment(context.Background(), testUUID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.ParentID == nil {
		t.Error("expected non-nil parentId")
	}
}

func TestUpdateDepartment_MissingParent(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Backend", "BE"), nil
		},
		parentDepartmentExists: func(_ context.Context, _ pgtype.UUID) (bool, error) { return false, nil },
	})
	pid := parentUUID
	req := UpdateDepartmentRequest{}
	req.ParentID.Present = true
	req.ParentID.Value = &pid
	_, err := svc.UpdateDepartment(context.Background(), testUUID, req)
	if !errors.Is(err, ErrParentDepartmentNotFound) {
		t.Errorf("expected ErrParentDepartmentNotFound, got %v", err)
	}
}

func TestUpdateDepartment_SelfParentRejected(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Engineering", "ENG"), nil
		},
	})
	selfID := testUUID
	req := UpdateDepartmentRequest{}
	req.ParentID.Present = true
	req.ParentID.Value = &selfID
	_, err := svc.UpdateDepartment(context.Background(), testUUID, req)
	if !errors.Is(err, ErrInvalidDepartmentHierarchy) {
		t.Errorf("expected ErrInvalidDepartmentHierarchy, got %v", err)
	}
}

func TestUpdateDepartment_NameConflictExcludingID(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Engineering", "ENG"), nil
		},
		departmentNameExistsExcluding: func(_ context.Context, _ db.DepartmentNameExistsExcludingIDParams) (bool, error) {
			return true, nil
		},
	})
	newName := "Software"
	_, err := svc.UpdateDepartment(context.Background(), testUUID, UpdateDepartmentRequest{Name: &newName})
	if !errors.Is(err, ErrDepartmentNameConflict) {
		t.Errorf("expected ErrDepartmentNameConflict, got %v", err)
	}
}

func TestUpdateDepartment_CodeConflictExcludingID(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return makeGetRow(testUUID, "Engineering", "ENG"), nil
		},
		departmentCodeExistsExcluding: func(_ context.Context, _ db.DepartmentCodeExistsExcludingIDParams) (bool, error) {
			return true, nil
		},
	})
	newCode := "SW"
	_, err := svc.UpdateDepartment(context.Background(), testUUID, UpdateDepartmentRequest{Code: &newCode})
	if !errors.Is(err, ErrDepartmentCodeConflict) {
		t.Errorf("expected ErrDepartmentCodeConflict, got %v", err)
	}
}

func TestUpdateDepartment_NotFound(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		getDepartmentByID: func(_ context.Context, _ pgtype.UUID) (db.GetDepartmentByIDRow, error) {
			return db.GetDepartmentByIDRow{}, pgx.ErrNoRows
		},
	})
	_, err := svc.UpdateDepartment(context.Background(), testUUID, UpdateDepartmentRequest{})
	if !errors.Is(err, ErrDepartmentNotFound) {
		t.Errorf("expected ErrDepartmentNotFound, got %v", err)
	}
}

// ── Status tests ──────────────────────────────────────────────────────────────

func TestUpdateDepartmentStatus_Activate(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		updateDepartmentStatus: func(_ context.Context, arg db.UpdateDepartmentStatusParams) (db.UpdateDepartmentStatusRow, error) {
			return makeUpdateStatusRow(arg.Status), nil
		},
	})
	d, err := svc.UpdateDepartmentStatus(context.Background(), testUUID, UpdateDepartmentStatusRequest{Status: "active"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Status != "active" {
		t.Errorf("expected status 'active', got %q", d.Status)
	}
}

func TestUpdateDepartmentStatus_Deactivate(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		updateDepartmentStatus: func(_ context.Context, arg db.UpdateDepartmentStatusParams) (db.UpdateDepartmentStatusRow, error) {
			return makeUpdateStatusRow(arg.Status), nil
		},
	})
	d, err := svc.UpdateDepartmentStatus(context.Background(), testUUID, UpdateDepartmentStatusRequest{Status: "inactive"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Status != "inactive" {
		t.Errorf("expected status 'inactive', got %q", d.Status)
	}
}

func TestUpdateDepartmentStatus_InvalidStatus(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{})
	_, err := svc.UpdateDepartmentStatus(context.Background(), testUUID, UpdateDepartmentStatusRequest{Status: "deleted"})
	if !errors.Is(err, ErrInvalidDepartmentStatus) {
		t.Errorf("expected ErrInvalidDepartmentStatus, got %v", err)
	}
}

func TestUpdateDepartmentStatus_NotFound(t *testing.T) {
	svc := NewDepartmentService(&fakeDepartmentStore{
		updateDepartmentStatus: func(_ context.Context, _ db.UpdateDepartmentStatusParams) (db.UpdateDepartmentStatusRow, error) {
			return db.UpdateDepartmentStatusRow{}, pgx.ErrNoRows
		},
	})
	_, err := svc.UpdateDepartmentStatus(context.Background(), testUUID, UpdateDepartmentStatusRequest{Status: "active"})
	if !errors.Is(err, ErrDepartmentNotFound) {
		t.Errorf("expected ErrDepartmentNotFound, got %v", err)
	}
}
