# AssetFlow Backend

Go REST API for AssetFlow, built with chi/v5, pgx/v5, Goose, and sqlc.

---

## Architecture

```
cmd/
  api/main.go              — entry point: loads config, wires DI, starts server
  dbdoctor/main.go         — temporary CLI for database inspection (see below)

internal/
  config/config.go         — environment-based configuration loader
  database/pool.go         — pgxpool initialization
  db/                      — sqlc-generated code (DO NOT edit manually)
  core/
    department_types.go    — domain types, request/response models, OptionalNullableUUID
    department_errors.go   — stable domain error sentinels
    pg_errors.go           — PostgreSQL SQLSTATE → domain error mapping
    department_service.go  — DepartmentService + DepartmentServicer interface
    department_service_test.go
  api/
    auth.go                — Principal type, SetPrincipal, GetPrincipal, RequireAdmin
    response.go            — writeData / writeError JSON helpers
    department_handler.go  — HTTP handlers (thin; delegate to service)
    router.go              — chi router construction
    department_handler_test.go

sql/
  migrations/              — Goose SQL migrations
  queries/                 — sqlc SQL query files
```

---

## Department Endpoints

All routes require **Admin** authorization.

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| POST | `/api/v1/departments` | Create department | 201 |
| GET | `/api/v1/departments` | List all departments | 200 |
| GET | `/api/v1/departments/{id}` | Get one department | 200 |
| PATCH | `/api/v1/departments/{id}` | Update name/code/parent | 200 |
| PATCH | `/api/v1/departments/{id}/status` | Activate or deactivate | 200 |

### Create

```
POST /api/v1/departments
Content-Type: application/json

{
  "name": "Engineering",
  "code": "ENG",
  "parentId": null
}
```

Response `201`:
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

### Update (PATCH)

All fields are optional. `parentId` distinguishes three states:
- **omitted** → preserve current parent
- **`null`** → remove current parent
- **UUID string** → assign new parent

```json
{ "name": "Software Engineering", "parentId": null }
```

### Status

```
PATCH /api/v1/departments/{id}/status

{ "status": "inactive" }
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

Error codes: `unauthorized`, `forbidden`, `invalid_input`, `invalid_request`,
`department_not_found`, `parent_department_not_found`, `department_name_conflict`,
`department_code_conflict`, `invalid_department_hierarchy`, `invalid_status`,
`internal_error`.

---

## Authorization Seam

Department routes are Admin-only. The `RequireAdmin` middleware in
`internal/api/auth.go` reads a `Principal` from the request context:

- No principal → **401**
- Unauthenticated principal → **401**
- Authenticated non-admin → **403**
- Authenticated Admin → continues

**Production integration (deferred):** A future Supabase Auth middleware will
verify the JWT, decode claims, and call `api.SetPrincipal(ctx, principal)`
before `RequireAdmin` sees the request.

Do not add `X-Role` headers or development bypasses. Tests inject a
`Principal` directly into the request context.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `HTTP_PORT` | | `8080` | HTTP listen port |
| `DATABASE_MIN_CONNS` | | `2` | Min pool connections |
| `DATABASE_MAX_CONNS` | | `10` | Max pool connections |
| `DATABASE_CONNECT_TIMEOUT` | | `10s` | DB connect timeout (Go duration) |
| `HTTP_REQUEST_TIMEOUT` | | `30s` | Per-request timeout (Go duration) |
| `HTTP_SHUTDOWN_TIMEOUT` | | `15s` | Graceful shutdown wait |

Copy `.env.example` and fill in your values:
```sh
cp .env.example .env
```

---

## Running the API

```sh
# Set required variable
export DATABASE_URL="postgresql://user:pass@localhost:5432/assetflow"

# Start
go run ./cmd/api
```

---

## Running Tests

Unit and handler tests require **no database**:

```sh
go test ./...
```

Integration tests (skipped unless env var is set — never uses shared DATABASE_URL):

```sh
export ASSETFLOW_TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/assetflow_test"
go test ./...
```

> ⚠️ Never set `ASSETFLOW_TEST_DATABASE_URL` to the shared Supabase database.

---

## sqlc Code Generation

```sh
# Use the 64-bit binary to avoid wazero memory issues on 32-bit Go builds
sqlc generate
```

Generated files are in `internal/db/` — do not edit them manually.

---

## Database Migrations

> ⚠️ **Do not run migrations against the shared Supabase database.** Each
> developer runs migrations against their own local or isolated database.
> Schemas will be reconciled before merging branches.

```sh
# Apply migrations
goose -dir sql/migrations postgres "$DATABASE_URL" up

# Check status
goose -dir sql/migrations postgres "$DATABASE_URL" status

# Roll back
goose -dir sql/migrations postgres "$DATABASE_URL" down
```

---

## Department Head Assignment

The `departments` table intentionally does **not** have a `head_id` column.
Department Head assignment is deferred until the **Employees module is merged**.
A subsequent migration will add:

```sql
ALTER TABLE departments
    ADD COLUMN head_id UUID REFERENCES employees(id) ON DELETE SET NULL;
```

---

## DB Doctor (Temporary CLI)

`cmd/dbdoctor` is a temporary diagnostic tool for inspecting and safely
dropping a pre-existing `departments` table that blocks migrations.

```sh
# Inspect (read-only)
go run ./cmd/dbdoctor inspect

# Drop only if empty and no FK dependents
go run ./cmd/dbdoctor drop-empty-departments --confirm DROP_EMPTY_DEPARTMENTS
```

This tool should be **removed before the final PR** once migrations are stable.
