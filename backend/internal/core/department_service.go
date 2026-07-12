package core

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/HarshalHarne/assetflow/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
)

// DepartmentServicer is the interface the HTTP layer depends on.
// It is implemented by DepartmentService and can be mocked in tests.
type DepartmentServicer interface {
	CreateDepartment(ctx context.Context, req CreateDepartmentRequest) (Department, error)
	GetDepartment(ctx context.Context, id string) (Department, error)
	ListDepartments(ctx context.Context) ([]Department, error)
	UpdateDepartment(ctx context.Context, id string, req UpdateDepartmentRequest) (Department, error)
	UpdateDepartmentStatus(ctx context.Context, id string, req UpdateDepartmentStatusRequest) (Department, error)
}

// DepartmentQuerier is a narrow interface containing only the DB methods
// required by DepartmentService. *db.Queries satisfies this interface, and
// test fakes only need to implement these methods (not the full db.Querier).
type DepartmentQuerier interface {
	CreateDepartment(ctx context.Context, arg db.CreateDepartmentParams) (db.CreateDepartmentRow, error)
	DepartmentCodeExists(ctx context.Context, code string) (bool, error)
	DepartmentCodeExistsExcludingID(ctx context.Context, arg db.DepartmentCodeExistsExcludingIDParams) (bool, error)
	DepartmentNameExists(ctx context.Context, name string) (bool, error)
	DepartmentNameExistsExcludingID(ctx context.Context, arg db.DepartmentNameExistsExcludingIDParams) (bool, error)
	GetDepartmentByID(ctx context.Context, id pgtype.UUID) (db.GetDepartmentByIDRow, error)
	ListDepartments(ctx context.Context) ([]db.ListDepartmentsRow, error)
	ParentDepartmentExists(ctx context.Context, parentID pgtype.UUID) (bool, error)
	UpdateDepartment(ctx context.Context, arg db.UpdateDepartmentParams) (db.UpdateDepartmentRow, error)
	UpdateDepartmentStatus(ctx context.Context, arg db.UpdateDepartmentStatusParams) (db.UpdateDepartmentStatusRow, error)
}

// DepartmentService implements DepartmentServicer using a DepartmentQuerier.
type DepartmentService struct {
	store DepartmentQuerier
}

// NewDepartmentService constructs a DepartmentService.
// store is typically *db.Queries backed by pgxpool; in tests it is a mock.
func NewDepartmentService(store DepartmentQuerier) *DepartmentService {
	return &DepartmentService{store: store}
}

// ── Create ───────────────────────────────────────────────────────────────────

func (s *DepartmentService) CreateDepartment(ctx context.Context, req CreateDepartmentRequest) (Department, error) {
	name := strings.TrimSpace(req.Name)
	code := strings.ToUpper(strings.TrimSpace(req.Code))

	if name == "" {
		return Department{}, fmt.Errorf("%w: name must not be blank", ErrInvalidInput)
	}
	if code == "" {
		return Department{}, fmt.Errorf("%w: code must not be blank", ErrInvalidInput)
	}

	nameExists, err := s.store.DepartmentNameExists(ctx, name)
	if err != nil {
		return Department{}, fmt.Errorf("checking name: %w", mapDBError(err))
	}
	if nameExists {
		return Department{}, ErrDepartmentNameConflict
	}

	codeExists, err := s.store.DepartmentCodeExists(ctx, code)
	if err != nil {
		return Department{}, fmt.Errorf("checking code: %w", mapDBError(err))
	}
	if codeExists {
		return Department{}, ErrDepartmentCodeConflict
	}

	parentID := pgtype.UUID{Valid: false}
	if req.ParentID != nil {
		parentID, err = parseUUID(*req.ParentID)
		if err != nil {
			return Department{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
		}
		ok, err := s.store.ParentDepartmentExists(ctx, parentID)
		if err != nil {
			return Department{}, fmt.Errorf("checking parent: %w", mapDBError(err))
		}
		if !ok {
			return Department{}, ErrParentDepartmentNotFound
		}
	}

	row, err := s.store.CreateDepartment(ctx, db.CreateDepartmentParams{
		Name:     name,
		Code:     code,
		ParentID: parentID,
	})
	if err != nil {
		return Department{}, mapDBError(err)
	}

	return createRowToDepartment(row), nil
}

// ── Get ──────────────────────────────────────────────────────────────────────

func (s *DepartmentService) GetDepartment(ctx context.Context, id string) (Department, error) {
	uid, err := parseUUID(id)
	if err != nil {
		return Department{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	row, err := s.store.GetDepartmentByID(ctx, uid)
	if err != nil {
		return Department{}, mapDBError(err)
	}

	return getRowToDepartment(row), nil
}

// ── List ─────────────────────────────────────────────────────────────────────

func (s *DepartmentService) ListDepartments(ctx context.Context) ([]Department, error) {
	rows, err := s.store.ListDepartments(ctx)
	if err != nil {
		return nil, mapDBError(err)
	}

	result := make([]Department, 0, len(rows))
	for _, row := range rows {
		result = append(result, listRowToDepartment(row))
	}
	return result, nil
}

// ── Update ───────────────────────────────────────────────────────────────────

func (s *DepartmentService) UpdateDepartment(ctx context.Context, id string, req UpdateDepartmentRequest) (Department, error) {
	uid, err := parseUUID(id)
	if err != nil {
		return Department{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	// 1. Read current state.
	current, err := s.store.GetDepartmentByID(ctx, uid)
	if err != nil {
		return Department{}, mapDBError(err)
	}

	// 2. Resolve name.
	name := current.Name
	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
		if name == "" {
			return Department{}, fmt.Errorf("%w: name must not be blank", ErrInvalidInput)
		}
		conflict, err := s.store.DepartmentNameExistsExcludingID(ctx, db.DepartmentNameExistsExcludingIDParams{
			Name: name,
			ID:   uid,
		})
		if err != nil {
			return Department{}, fmt.Errorf("checking name: %w", mapDBError(err))
		}
		if conflict {
			return Department{}, ErrDepartmentNameConflict
		}
	}

	// 3. Resolve code.
	code := current.Code
	if req.Code != nil {
		code = strings.ToUpper(strings.TrimSpace(*req.Code))
		if code == "" {
			return Department{}, fmt.Errorf("%w: code must not be blank", ErrInvalidInput)
		}
		conflict, err := s.store.DepartmentCodeExistsExcludingID(ctx, db.DepartmentCodeExistsExcludingIDParams{
			Code: code,
			ID:   uid,
		})
		if err != nil {
			return Department{}, fmt.Errorf("checking code: %w", mapDBError(err))
		}
		if conflict {
			return Department{}, ErrDepartmentCodeConflict
		}
	}

	// 4. Resolve parentID.
	parentID := current.ParentID // preserve by default
	if req.ParentID.Present {
		if req.ParentID.Value == nil {
			// Explicitly null — remove parent.
			parentID = pgtype.UUID{Valid: false}
		} else {
			newParentID, err := parseUUID(*req.ParentID.Value)
			if err != nil {
				return Department{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
			}
			// Reject self-parenting at service level.
			if newParentID == uid {
				return Department{}, fmt.Errorf("%w: a department cannot be its own parent", ErrInvalidDepartmentHierarchy)
			}
			ok, err := s.store.ParentDepartmentExists(ctx, newParentID)
			if err != nil {
				return Department{}, fmt.Errorf("checking parent: %w", mapDBError(err))
			}
			if !ok {
				return Department{}, ErrParentDepartmentNotFound
			}
			parentID = newParentID
		}
	}

	// 5. Persist. Indirect-cycle enforcement is the DB trigger's responsibility.
	row, err := s.store.UpdateDepartment(ctx, db.UpdateDepartmentParams{
		Name:     name,
		Code:     code,
		ParentID: parentID,
		ID:       uid,
	})
	if err != nil {
		return Department{}, mapDBError(err)
	}

	return updateRowToDepartment(row), nil
}

// ── Status ───────────────────────────────────────────────────────────────────

func (s *DepartmentService) UpdateDepartmentStatus(ctx context.Context, id string, req UpdateDepartmentStatusRequest) (Department, error) {
	if req.Status != "active" && req.Status != "inactive" {
		return Department{}, fmt.Errorf("%w: must be 'active' or 'inactive'", ErrInvalidDepartmentStatus)
	}

	uid, err := parseUUID(id)
	if err != nil {
		return Department{}, fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
	}

	row, err := s.store.UpdateDepartmentStatus(ctx, db.UpdateDepartmentStatusParams{
		Status: db.DepartmentStatus(req.Status),
		ID:     uid,
	})
	if err != nil {
		return Department{}, mapDBError(err)
	}

	return updateStatusRowToDepartment(row), nil
}

// ── Type converters ───────────────────────────────────────────────────────────

func createRowToDepartment(r db.CreateDepartmentRow) Department {
	d := Department{
		ID:        uuidToString(r.ID),
		Name:      r.Name,
		Code:      r.Code,
		Status:    string(r.Status),
		CreatedAt: pgTimestampToTime(r.CreatedAt),
		UpdatedAt: pgTimestampToTime(r.UpdatedAt),
	}
	if r.ParentID.Valid {
		s := uuidToString(r.ParentID)
		d.ParentID = &s
	}
	if r.ParentName != nil {
		d.ParentName = r.ParentName
	}
	return d
}

func getRowToDepartment(r db.GetDepartmentByIDRow) Department {
	d := Department{
		ID:        uuidToString(r.ID),
		Name:      r.Name,
		Code:      r.Code,
		Status:    string(r.Status),
		CreatedAt: pgTimestampToTime(r.CreatedAt),
		UpdatedAt: pgTimestampToTime(r.UpdatedAt),
	}
	if r.ParentID.Valid {
		s := uuidToString(r.ParentID)
		d.ParentID = &s
	}
	if r.ParentName != nil {
		d.ParentName = r.ParentName
	}
	return d
}

func listRowToDepartment(r db.ListDepartmentsRow) Department {
	d := Department{
		ID:        uuidToString(r.ID),
		Name:      r.Name,
		Code:      r.Code,
		Status:    string(r.Status),
		CreatedAt: pgTimestampToTime(r.CreatedAt),
		UpdatedAt: pgTimestampToTime(r.UpdatedAt),
	}
	if r.ParentID.Valid {
		s := uuidToString(r.ParentID)
		d.ParentID = &s
	}
	if r.ParentName != nil {
		d.ParentName = r.ParentName
	}
	return d
}

func updateRowToDepartment(r db.UpdateDepartmentRow) Department {
	d := Department{
		ID:        uuidToString(r.ID),
		Name:      r.Name,
		Code:      r.Code,
		Status:    string(r.Status),
		CreatedAt: pgTimestampToTime(r.CreatedAt),
		UpdatedAt: pgTimestampToTime(r.UpdatedAt),
	}
	if r.ParentID.Valid {
		s := uuidToString(r.ParentID)
		d.ParentID = &s
	}
	if r.ParentName != nil {
		d.ParentName = r.ParentName
	}
	return d
}

func updateStatusRowToDepartment(r db.UpdateDepartmentStatusRow) Department {
	d := Department{
		ID:        uuidToString(r.ID),
		Name:      r.Name,
		Code:      r.Code,
		Status:    string(r.Status),
		CreatedAt: pgTimestampToTime(r.CreatedAt),
		UpdatedAt: pgTimestampToTime(r.UpdatedAt),
	}
	if r.ParentID.Valid {
		s := uuidToString(r.ParentID)
		d.ParentID = &s
	}
	if r.ParentName != nil {
		d.ParentName = r.ParentName
	}
	return d
}

// ── UUID / time helpers ───────────────────────────────────────────────────────

func parseUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	if err := u.Scan(s); err != nil {
		return pgtype.UUID{}, fmt.Errorf("invalid UUID %q", s)
	}
	return u, nil
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf(
		"%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
		b[0], b[1], b[2], b[3],
		b[4], b[5],
		b[6], b[7],
		b[8], b[9],
		b[10], b[11], b[12], b[13], b[14], b[15],
	)
}

func pgTimestampToTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}
