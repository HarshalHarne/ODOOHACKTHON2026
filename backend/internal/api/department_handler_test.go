package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/HarshalHarne/assetflow/internal/api"
	"github.com/HarshalHarne/assetflow/internal/core"
)

// ── Fake service ──────────────────────────────────────────────────────────────

type fakeDeptService struct {
	createFn       func(ctx context.Context, req core.CreateDepartmentRequest) (core.Department, error)
	getFn          func(ctx context.Context, id string) (core.Department, error)
	listFn         func(ctx context.Context) ([]core.Department, error)
	updateFn       func(ctx context.Context, id string, req core.UpdateDepartmentRequest) (core.Department, error)
	updateStatusFn func(ctx context.Context, id string, req core.UpdateDepartmentStatusRequest) (core.Department, error)
}

func (f *fakeDeptService) CreateDepartment(ctx context.Context, req core.CreateDepartmentRequest) (core.Department, error) {
	if f.createFn != nil {
		return f.createFn(ctx, req)
	}
	return core.Department{}, nil
}
func (f *fakeDeptService) GetDepartment(ctx context.Context, id string) (core.Department, error) {
	if f.getFn != nil {
		return f.getFn(ctx, id)
	}
	return core.Department{}, nil
}
func (f *fakeDeptService) ListDepartments(ctx context.Context) ([]core.Department, error) {
	if f.listFn != nil {
		return f.listFn(ctx)
	}
	return []core.Department{}, nil
}
func (f *fakeDeptService) UpdateDepartment(ctx context.Context, id string, req core.UpdateDepartmentRequest) (core.Department, error) {
	if f.updateFn != nil {
		return f.updateFn(ctx, id, req)
	}
	return core.Department{}, nil
}
func (f *fakeDeptService) UpdateDepartmentStatus(ctx context.Context, id string, req core.UpdateDepartmentStatusRequest) (core.Department, error) {
	if f.updateStatusFn != nil {
		return f.updateStatusFn(ctx, id, req)
	}
	return core.Department{}, nil
}

// ── Test helpers ──────────────────────────────────────────────────────────────

const testUUID = "11111111-1111-1111-1111-111111111111"

func sampleDept() core.Department {
	return core.Department{
		ID:        testUUID,
		Name:      "Engineering",
		Code:      "ENG",
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func adminPrincipal() api.Principal {
	return api.Principal{UserID: "u1", Role: api.RoleAdmin, Authenticated: true}
}

func userPrincipal() api.Principal {
	return api.Principal{UserID: "u2", Role: api.RoleUser, Authenticated: true}
}

// newTestRouter creates a router with an optional principal injector middleware
// placed BEFORE RequireAdmin, simulating what a real auth middleware would do.
func newTestRouter(svc core.DepartmentServicer, p *api.Principal) http.Handler {
	h := api.NewDepartmentHandler(svc)
	deps := api.RouterDeps{
		DepartmentHandler: h,
		RequestTimeout:    30 * time.Second,
	}
	router := api.NewRouter(deps)

	if p == nil {
		return router
	}

	// Inject the principal before the request reaches the router.
	principal := *p
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := api.SetPrincipal(r.Context(), principal)
		router.ServeHTTP(w, r.WithContext(ctx))
	})
}

func jsonBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	return bytes.NewBuffer(b)
}

func do(t *testing.T, router http.Handler, method, path string, body *bytes.Buffer) *httptest.ResponseRecorder {
	t.Helper()
	var req *http.Request
	var err error
	if body != nil {
		req, err = http.NewRequest(method, path, body)
	} else {
		req, err = http.NewRequest(method, path, nil)
	}
	if err != nil {
		t.Fatalf("http.NewRequest: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	return rr
}

// ── Auth tests ────────────────────────────────────────────────────────────────

func TestHandler_Unauthenticated_Returns401(t *testing.T) {
	router := newTestRouter(&fakeDeptService{}, nil) // no principal
	rr := do(t, router, http.MethodGet, "/api/v1/departments", nil)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

func TestHandler_NonAdmin_Returns403(t *testing.T) {
	p := userPrincipal()
	router := newTestRouter(&fakeDeptService{}, &p)
	rr := do(t, router, http.MethodGet, "/api/v1/departments", nil)
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

// ── Create tests ──────────────────────────────────────────────────────────────

func TestHandler_AdminCanCreate_Returns201(t *testing.T) {
	svc := &fakeDeptService{
		createFn: func(_ context.Context, _ core.CreateDepartmentRequest) (core.Department, error) {
			return sampleDept(), nil
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	body := jsonBody(t, map[string]any{"name": "Engineering", "code": "ENG"})
	rr := do(t, router, http.MethodPost, "/api/v1/departments", body)
	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body)
	}
}

func TestHandler_MalformedJSON_Returns400(t *testing.T) {
	p := adminPrincipal()
	router := newTestRouter(&fakeDeptService{}, &p)
	rr := do(t, router, http.MethodPost, "/api/v1/departments", bytes.NewBufferString("{bad json"))
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestHandler_DuplicateName_Returns409(t *testing.T) {
	svc := &fakeDeptService{
		createFn: func(_ context.Context, _ core.CreateDepartmentRequest) (core.Department, error) {
			return core.Department{}, core.ErrDepartmentNameConflict
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	body := jsonBody(t, map[string]any{"name": "Engineering", "code": "ENG"})
	rr := do(t, router, http.MethodPost, "/api/v1/departments", body)
	if rr.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", rr.Code)
	}
}

// ── Get tests ─────────────────────────────────────────────────────────────────

func TestHandler_InvalidUUID_Returns400(t *testing.T) {
	svc := &fakeDeptService{
		getFn: func(_ context.Context, id string) (core.Department, error) {
			return core.Department{}, errors.New("invalid UUID")
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	rr := do(t, router, http.MethodGet, "/api/v1/departments/not-a-uuid", nil)
	// The service maps this to ErrInvalidInput → 400, but let's also accept
	// that the service itself returns 500 for unknown errors. Let's wire
	// the fake to return ErrInvalidInput.
	svc.getFn = func(_ context.Context, _ string) (core.Department, error) {
		return core.Department{}, errors.Join(core.ErrInvalidInput, errors.New("bad uuid"))
	}
	rr = do(t, router, http.MethodGet, "/api/v1/departments/not-a-uuid", nil)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", rr.Code, rr.Body)
	}
}

func TestHandler_MissingDepartment_Returns404(t *testing.T) {
	svc := &fakeDeptService{
		getFn: func(_ context.Context, _ string) (core.Department, error) {
			return core.Department{}, core.ErrDepartmentNotFound
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	rr := do(t, router, http.MethodGet, "/api/v1/departments/"+testUUID, nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

// ── List tests ────────────────────────────────────────────────────────────────

func TestHandler_List_Returns200(t *testing.T) {
	svc := &fakeDeptService{
		listFn: func(_ context.Context) ([]core.Department, error) {
			return []core.Department{sampleDept()}, nil
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	rr := do(t, router, http.MethodGet, "/api/v1/departments", nil)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestHandler_EmptyList_ReturnsArray(t *testing.T) {
	svc := &fakeDeptService{
		listFn: func(_ context.Context) ([]core.Department, error) {
			return []core.Department{}, nil
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	rr := do(t, router, http.MethodGet, "/api/v1/departments", nil)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp map[string]json.RawMessage
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	var items []core.Department
	if err := json.Unmarshal(resp["data"], &items); err != nil {
		t.Fatalf("data decode: %v", err)
	}
	if items == nil || len(items) != 0 {
		t.Errorf("expected empty array, got %v", items)
	}
}

// ── Update tests ──────────────────────────────────────────────────────────────

func TestHandler_Update_Returns200(t *testing.T) {
	svc := &fakeDeptService{
		updateFn: func(_ context.Context, _ string, _ core.UpdateDepartmentRequest) (core.Department, error) {
			return sampleDept(), nil
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	body := jsonBody(t, map[string]any{"name": "Software"})
	rr := do(t, router, http.MethodPatch, "/api/v1/departments/"+testUUID, body)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body)
	}
}

func TestHandler_Update_ExplicitNullRemovesParent(t *testing.T) {
	var capturedReq core.UpdateDepartmentRequest
	svc := &fakeDeptService{
		updateFn: func(_ context.Context, _ string, req core.UpdateDepartmentRequest) (core.Department, error) {
			capturedReq = req
			return sampleDept(), nil
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	// Explicit null parentId in JSON
	body := bytes.NewBufferString(`{"parentId":null}`)
	rr := do(t, router, http.MethodPatch, "/api/v1/departments/"+testUUID, body)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body)
	}
	if !capturedReq.ParentID.Present {
		t.Error("expected ParentID.Present=true for explicit null")
	}
	if capturedReq.ParentID.Value != nil {
		t.Error("expected ParentID.Value=nil for explicit null")
	}
}

// ── Status tests ──────────────────────────────────────────────────────────────

func TestHandler_StatusUpdate_Returns200(t *testing.T) {
	svc := &fakeDeptService{
		updateStatusFn: func(_ context.Context, _ string, _ core.UpdateDepartmentStatusRequest) (core.Department, error) {
			d := sampleDept()
			d.Status = "inactive"
			return d, nil
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	body := jsonBody(t, map[string]string{"status": "inactive"})
	rr := do(t, router, http.MethodPatch, "/api/v1/departments/"+testUUID+"/status", body)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body)
	}
}

func TestHandler_InvalidStatus_Returns400(t *testing.T) {
	svc := &fakeDeptService{
		updateStatusFn: func(_ context.Context, _ string, _ core.UpdateDepartmentStatusRequest) (core.Department, error) {
			return core.Department{}, core.ErrInvalidDepartmentStatus
		},
	}
	p := adminPrincipal()
	router := newTestRouter(svc, &p)
	body := jsonBody(t, map[string]string{"status": "deleted"})
	rr := do(t, router, http.MethodPatch, "/api/v1/departments/"+testUUID+"/status", body)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}
