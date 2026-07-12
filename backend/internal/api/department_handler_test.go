package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/HarshalHarne/assetflow/internal/api"
	"github.com/HarshalHarne/assetflow/internal/core"
	"github.com/gofiber/fiber/v3"
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

// newTestApp creates a fiber app with an optional principal injector middleware
// placed BEFORE the routes, simulating what a real auth middleware would do.
func newTestApp(svc core.DepartmentServicer, p *api.Principal) *fiber.App {
	app := fiber.New()

	if p != nil {
		principal := *p
		app.Use(func(c fiber.Ctx) error {
			api.SetPrincipal(c, principal)
			return c.Next()
		})
	}

	h := api.NewDepartmentHandler(svc)
	deps := api.RouterDeps{
		DepartmentHandler: h,
	}
	api.RegisterRoutes(app, deps)

	return app
}

func jsonBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	return bytes.NewBuffer(b)
}

func do(t *testing.T, app *fiber.App, method, path string, body *bytes.Buffer) *http.Response {
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
	
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return resp
}

// ── Auth tests ────────────────────────────────────────────────────────────────

func TestHandler_Unauthenticated_Returns401(t *testing.T) {
	app := newTestApp(&fakeDeptService{}, nil) // no principal
	resp := do(t, app, http.MethodGet, "/api/v1/departments", nil)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestHandler_NonAdmin_Returns403(t *testing.T) {
	p := userPrincipal()
	app := newTestApp(&fakeDeptService{}, &p)
	resp := do(t, app, http.MethodGet, "/api/v1/departments", nil)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403, got %d", resp.StatusCode)
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
	app := newTestApp(svc, &p)
	body := jsonBody(t, map[string]any{"name": "Engineering", "code": "ENG"})
	resp := do(t, app, http.MethodPost, "/api/v1/departments", body)
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected 201, got %d", resp.StatusCode)
	}
}

func TestHandler_MalformedJSON_Returns400(t *testing.T) {
	p := adminPrincipal()
	app := newTestApp(&fakeDeptService{}, &p)
	resp := do(t, app, http.MethodPost, "/api/v1/departments", bytes.NewBufferString("{bad json"))
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_DuplicateName_Returns409(t *testing.T) {
	svc := &fakeDeptService{
		createFn: func(_ context.Context, _ core.CreateDepartmentRequest) (core.Department, error) {
			return core.Department{}, core.ErrDepartmentNameConflict
		},
	}
	p := adminPrincipal()
	app := newTestApp(svc, &p)
	body := jsonBody(t, map[string]any{"name": "Engineering", "code": "ENG"})
	resp := do(t, app, http.MethodPost, "/api/v1/departments", body)
	if resp.StatusCode != http.StatusConflict {
		t.Errorf("expected 409, got %d", resp.StatusCode)
	}
}

// ── Get tests ─────────────────────────────────────────────────────────────────

func TestHandler_InvalidUUID_Returns400(t *testing.T) {
	svc := &fakeDeptService{
		getFn: func(_ context.Context, id string) (core.Department, error) {
			return core.Department{}, errors.Join(core.ErrInvalidInput, errors.New("bad uuid"))
		},
	}
	p := adminPrincipal()
	app := newTestApp(svc, &p)
	resp := do(t, app, http.MethodGet, "/api/v1/departments/not-a-uuid", nil)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandler_MissingDepartment_Returns404(t *testing.T) {
	svc := &fakeDeptService{
		getFn: func(_ context.Context, _ string) (core.Department, error) {
			return core.Department{}, core.ErrDepartmentNotFound
		},
	}
	p := adminPrincipal()
	app := newTestApp(svc, &p)
	resp := do(t, app, http.MethodGet, "/api/v1/departments/"+testUUID, nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404, got %d", resp.StatusCode)
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
	app := newTestApp(svc, &p)
	resp := do(t, app, http.MethodGet, "/api/v1/departments", nil)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestHandler_EmptyList_ReturnsArray(t *testing.T) {
	svc := &fakeDeptService{
		listFn: func(_ context.Context) ([]core.Department, error) {
			return []core.Department{}, nil
		},
	}
	p := adminPrincipal()
	app := newTestApp(svc, &p)
	resp := do(t, app, http.MethodGet, "/api/v1/departments", nil)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var respBody map[string]json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	var items []core.Department
	if err := json.Unmarshal(respBody["data"], &items); err != nil {
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
	app := newTestApp(svc, &p)
	body := jsonBody(t, map[string]any{"name": "Software"})
	resp := do(t, app, http.MethodPatch, "/api/v1/departments/"+testUUID, body)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
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
	app := newTestApp(svc, &p)
	body := bytes.NewBufferString(`{"parentId":null}`)
	resp := do(t, app, http.MethodPatch, "/api/v1/departments/"+testUUID, body)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
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
	app := newTestApp(svc, &p)
	body := jsonBody(t, map[string]string{"status": "inactive"})
	resp := do(t, app, http.MethodPatch, "/api/v1/departments/"+testUUID+"/status", body)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestHandler_InvalidStatus_Returns400(t *testing.T) {
	svc := &fakeDeptService{
		updateStatusFn: func(_ context.Context, _ string, _ core.UpdateDepartmentStatusRequest) (core.Department, error) {
			return core.Department{}, core.ErrInvalidDepartmentStatus
		},
	}
	p := adminPrincipal()
	app := newTestApp(svc, &p)
	body := jsonBody(t, map[string]string{"status": "deleted"})
	resp := do(t, app, http.MethodPatch, "/api/v1/departments/"+testUUID+"/status", body)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}
