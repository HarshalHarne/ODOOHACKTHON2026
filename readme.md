# AssetFlow

AssetFlow is a workspace and asset-management prototype with a modern Next.js frontend and a Go backend. The project is organized around two main concerns:

- Frontend experience for departments, assets, allocations, bookings, audits, maintenance, notifications, reports, and onboarding screens.
- Backend API for department management, backed by PostgreSQL through Go, pgx, sqlc, and Goose migrations.

## Repository overview

### Frontend
- Framework: Next.js 16 + React 19 + TypeScript
- Styling: Tailwind CSS and shadcn-style UI components
- Main app shell: [frontend/src/app](frontend/src/app)
- Workspace data layer: [frontend/src/lib/workspace](frontend/src/lib/workspace)
- Key feature areas:
  - Authentication: [frontend/src/app/login](frontend/src/app/login) and [frontend/src/app/signup](frontend/src/app/signup)
  - Workspace modules: [frontend/src/app/(workspace)](frontend/src/app/(workspace))
  - Shared UI: [frontend/src/components](frontend/src/components)

The current frontend implementation uses browser local storage for workspace state and demo data. It is not yet wired to the backend for most modules.

### Backend
- Runtime: Go 1.26.1
- Router: chi/v5
- Database access: pgx/v5 + sqlc + Goose migrations
- Main entrypoint: [backend/cmd/api/main.go](backend/cmd/api/main.go)
- HTTP layer: [backend/internal/api](backend/internal/api)
- Business logic: [backend/internal/core](backend/internal/core)
- Database layer: [backend/internal/db](backend/internal/db)
- SQL assets: [backend/sql](backend/sql)

## Architecture at a glance

```text
frontend/                -> Next.js UI and local workspace state
  src/app/               -> pages and route groups
  src/components/        -> reusable UI modules
  src/lib/workspace/    -> mock/workspace storage types and helpers

backend/                 -> Go API server
  cmd/api/               -> HTTP server bootstrap
  internal/api/          -> handlers, router, auth, JSON responses
  internal/core/         -> department service and domain models
  internal/database/     -> pgx connection pool setup
  internal/db/           -> sqlc-generated database layer
  sql/migrations/        -> database schema migrations
  sql/queries/           -> SQL queries consumed by sqlc
```

## Frontend feature map

The UI currently includes the following workspace modules:

- Dashboard and navigation shell
- Asset directory and asset allocation flows
- Booking and resource scheduling
- Maintenance board
- Audits and discrepancy reporting
- Organization setup and employee/department views
- Notifications and reporting dashboards

These modules are primarily implemented as React components and route-based pages under [frontend/src/components](frontend/src/components) and [frontend/src/app/(workspace)](frontend/src/app/(workspace)).

## Backend API surface

The backend currently exposes one production-ready resource group: departments.

### Health
- GET /health
- Returns a simple JSON status payload.

### Department endpoints
All department routes are protected by the admin-only middleware in [backend/internal/api/auth.go](backend/internal/api/auth.go).

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | /health | Basic health check | 200 |
| POST | /api/v1/departments | Create a department | 201 |
| GET | /api/v1/departments | List departments | 200 |
| GET | /api/v1/departments/{id} | Fetch one department | 200 |
| PATCH | /api/v1/departments/{id} | Update a department | 200 |
| PATCH | /api/v1/departments/{id}/status | Toggle active/inactive status | 200 |

### Request and response model

Department payload example:

```json
{
  "name": "Engineering",
  "code": "ENG",
  "parentId": null
}
```

Successful create/update response shape:

```json
{
  "data": {
    "id": "uuid",
    "name": "Engineering",
    "code": "ENG",
    "parentId": null,
    "parentName": null,
    "status": "active",
    "createdAt": "2026-07-12T10:30:00Z",
    "updatedAt": "2026-07-12T10:30:00Z"
  }
}
```

### Error format

```json
{
  "error": {
    "code": "department_name_conflict",
    "message": "A department with this name already exists."
  }
}
```

Common error codes:
- unauthorized
- forbidden
- invalid_input
- invalid_request
- department_not_found
- parent_department_not_found
- department_name_conflict
- department_code_conflict
- invalid_department_hierarchy
- invalid_status
- internal_error

## Authentication and authorization

The backend uses a principal-based auth seam in [backend/internal/api/auth.go](backend/internal/api/auth.go).

Current behavior:
- No principal in context -> 401
- Authenticated non-admin -> 403
- Authenticated admin -> request continues

The auth middleware is intentionally strict and is meant to be replaced later by a real authentication provider.

## Data and persistence notes

- The frontend workspace data is stored in browser local storage under the key assetflow-workspace-v2.
- The backend persists departments in PostgreSQL.
- The department table is created by Goose migrations in [backend/sql/migrations](backend/sql/migrations).
- sqlc-generated DB access is kept under [backend/internal/db](backend/internal/db) and should not be edited manually.

## Local development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
export DATABASE_URL="postgresql://user:pass@localhost:5432/assetflow"
go run ./cmd/api
```

### Tests
```bash
cd backend
go test ./...
```

## Important implementation note

The repository currently mixes two modes of operation:

1. A frontend-first demo experience with mock workspace data and local storage.
2. A backend API foundation for department management with database-backed persistence.

The frontend does not yet fully consume the backend API for the workspace modules, so the application should be considered a prototype rather than a fully integrated product.
