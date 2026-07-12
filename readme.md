# AssetFlow

**AssetFlow** is an Enterprise Asset and Resource Management System built for the Odoo Hackathon 2026. It provides a modern workspace UI for tracking assets, allocations, bookings, maintenance, audits, reports, and notifications, backed by a Go REST API with PostgreSQL persistence for department management.

---

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Quick start](#quick-start)
- [Frontend](#frontend)
  - [Routes and pages](#routes-and-pages)
  - [Workspace modules](#workspace-modules)
  - [UI architecture](#ui-architecture)
  - [Workspace data layer](#workspace-data-layer)
  - [Frontend scripts](#frontend-scripts)
- [Backend API](#backend-api)
  - [Base URL and middleware](#base-url-and-middleware)
  - [Health check](#health-check)
  - [Department routes](#department-routes)
  - [Request and response formats](#request-and-response-formats)
  - [Error codes](#error-codes)
  - [Authentication and authorization](#authentication-and-authorization)
- [Database](#database)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Integration status](#integration-status)
- [Contributing notes](#contributing-notes)

---

## Overview

AssetFlow combines two layers:

| Layer | Purpose | Status |
|---|---|---|
| **Frontend** | Full workspace UI with interactive modules | Complete (localStorage-backed demo data) |
| **Backend** | REST API for department CRUD | Complete (PostgreSQL-backed) |

The frontend runs as a self-contained demo using browser `localStorage` for workspace state. The backend exposes a production-style API for departments. **Most frontend modules are not yet wired to the backend API.**

---

## Tech stack

### Frontend

| Technology | Version / notes |
|---|---|
| Next.js (App Router) | 16.2.10 |
| React | 19.2.4 |
| TypeScript | strict mode |
| Tailwind CSS | 4.x |
| shadcn/ui (radix-nova) | UI primitives |
| lucide-react | Icons |
| localStorage | Workspace mock persistence |

### Backend

| Technology | Version / notes |
|---|---|
| Go | 1.26.1 |
| chi/v5 | HTTP router |
| pgx/v5 | PostgreSQL driver |
| sqlc | Type-safe SQL queries |
| Goose | Database migrations |

---

## Repository structure

```text
ODOOHACKTHON2026/
├── readme.md                          # This file
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   │   ├── layout.tsx             # Root layout (fonts, globals)
│   │   │   ├── page.tsx               # Redirects to /login
│   │   │   ├── login/                 # Login screen
│   │   │   ├── signup/                # Signup screen
│   │   │   └── (workspace)/           # Authenticated workspace shell
│   │   │       ├── layout.tsx         # DashboardLayout wrapper
│   │   │       ├── dashboard/
│   │   │       ├── organization/
│   │   │       ├── assets/
│   │   │       ├── allocations/
│   │   │       ├── bookings/
│   │   │       ├── maintenance/
│   │   │       ├── audits/
│   │   │       ├── reports/
│   │   │       └── notifications/
│   │   ├── components/
│   │   │   ├── dashboard/             # Shell, sidebar, navigation, KPIs
│   │   │   ├── workspace/             # Shared dark-panel UI primitives
│   │   │   ├── ui/                    # shadcn components (Button, Sheet, etc.)
│   │   │   ├── assets/
│   │   │   ├── allocations/
│   │   │   ├── bookings/
│   │   │   ├── maintenance/
│   │   │   ├── organization/
│   │   │   ├── audits/
│   │   │   ├── reports/
│   │   │   └── notifications/
│   │   ├── hooks/
│   │   │   └── use-workspace-data.ts  # Reactive localStorage hook
│   │   └── lib/
│   │       └── workspace/
│   │           ├── storage.ts         # CRUD + seed data
│   │           ├── types.ts           # Workspace TypeScript types
│   │           └── utils.ts           # Formatting, CSV, hash helpers
│   └── package.json
└── backend/
    ├── cmd/
    │   ├── api/main.go                # HTTP server entrypoint
    │   └── dbdoctor/main.go           # Temporary DB diagnostic CLI
    ├── internal/
    │   ├── api/                       # Router, handlers, auth, JSON helpers
    │   ├── core/                      # Domain services and types
    │   ├── database/                  # pgx connection pool
    │   ├── db/                        # sqlc-generated code (do not edit)
    │   └── config/                    # Environment config loader
    └── sql/
        ├── migrations/                # Goose SQL migrations
        └── queries/                   # sqlc query files
```

---

## Quick start

### Prerequisites

- Node.js 20+
- npm
- Go 1.26+
- PostgreSQL (for backend)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/login`; navigate to `/dashboard` or any workspace route.

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set DATABASE_URL

# Apply migrations (local DB only)
goose -dir sql/migrations postgres "$DATABASE_URL" up

# Start API server
go run ./cmd/api
```

Default listen port: **8080**

---

## Frontend

### Routes and pages

| Route | Page file | Feature component | Description |
|---|---|---|---|
| `/` | `src/app/page.tsx` | — | Redirects to `/login` |
| `/login` | `src/app/login/page.tsx` | `AuthLayout` | Login form (UI only) |
| `/signup` | `src/app/signup/page.tsx` | `AuthLayout` | Signup form (UI only) |
| `/dashboard` | `src/app/(workspace)/dashboard/page.tsx` | inline | KPI cards, quick actions, empty panels |
| `/organization` | `src/app/(workspace)/organization/page.tsx` | `OrganizationSetup` | Departments, categories, employees CRUD |
| `/assets` | `src/app/(workspace)/assets/page.tsx` | `AssetsDirectory` | Asset directory with search and filters |
| `/allocations` | `src/app/(workspace)/allocations/page.tsx` | `AllocationTransfer` | Allocate, transfer, return assets |
| `/bookings` | `src/app/(workspace)/bookings/page.tsx` | `ResourceBooking` | Resource booking calendar |
| `/maintenance` | `src/app/(workspace)/maintenance/page.tsx` | `MaintenanceBoard` | Kanban maintenance workflow |
| `/audits` | `src/app/(workspace)/audits/page.tsx` | `AuditWorkspace` | Audit cycles, findings, discrepancy reports |
| `/reports` | `src/app/(workspace)/reports/page.tsx` | `ReportsDashboard` | Operational analytics and exports |
| `/notifications` | `src/app/(workspace)/notifications/page.tsx` | `NotificationCenter` | Alert inbox with filters |

Sidebar navigation is defined in `frontend/src/components/dashboard/navigation.ts`.

### Workspace modules

#### Dashboard (`/dashboard`)
- Six KPI placeholder cards
- Quick action shortcuts to Assets, Bookings, Maintenance
- Empty panels for overdue returns, upcoming returns, recent activity

#### Organization setup (`/organization`)
- Tabbed CRUD for departments, categories, employees
- Sheet-based create/edit forms
- Status badges and data tables

#### Assets (`/assets`)
- Search by tag, serial, or QR code
- Filter by category, status, department
- Register, edit, and delete assets

#### Allocation & Transfer (`/allocations`)
- Allocate assets to employees
- Submit transfer requests
- Return assets with condition notes
- Allocation history timeline

#### Resource Booking (`/bookings`)
- Book shared resources by date and time slot
- Conflict detection (requested vs confirmed)
- Resource management

#### Maintenance (`/maintenance`)
- Kanban board: Pending → Approved → Technician assigned → In progress → Resolved
- Raise maintenance requests
- Assign technicians and advance workflow

#### Audit (`/audits`)
- KPI overview: active cycles, completed cycles, pending verifications, open discrepancies
- Create audit cycles scoped by department or location
- Auto-generate findings for matching assets
- Verify assets (verified / missing / damaged), add notes
- Close cycles (blocked while unverified findings remain)
- Discrepancy report with CSV export (missing and damaged only)

#### Reports (`/reports`)
- Filters: date range, department, category (with reset)
- KPIs: total assets, utilization rate, under maintenance, nearing retirement, active bookings, overdue returns
- Custom SVG utilization trend chart
- Maintenance frequency bars
- Most-used and idle asset tables
- Maintenance and retirement risk table
- Department allocation summary
- CSS Grid booking heatmap (Mon–Fri × time windows)
- Export CSV (department summary) and print report

#### Notifications (`/notifications`)
- 15+ seeded notifications across all types
- Read/unread and type filters with search
- Grouped by Today / Yesterday / Earlier
- Mark read/unread, mark all read, remove
- Detail sheet with suggested actions

### UI architecture

```text
RootLayout (Server)
└── (workspace)/layout.tsx (Server)
    └── DashboardLayout (Client)
        ├── AppSidebar          # Dark sidebar, nav links
        ├── Topbar              # Sidebar trigger, branding
        └── {page content}
            └── Feature component (Client)
                ├── PageHeader  # Title, description, actions, theme toggle
                └── ScreenPanel # Dark #0b1018 panels for feature content
```

**Design conventions:**
- Dark workspace panels (`ScreenPanel`) with emerald/teal accents
- Light KPI cards (`.workspace-card`) for summary metrics
- Pill-shaped filters and action buttons (`.screen-action`)
- Responsive grids with mobile stacking
- Sheet drawers for create/edit/detail flows

**Shared components:**

| Component | Path | Use |
|---|---|---|
| `PageHeader` | `components/dashboard/PageHeader.tsx` | Page title and actions |
| `ScreenPanel` | `components/workspace/ScreenPanel.tsx` | Dark feature container |
| `DataTable` | `components/workspace/DataTable.tsx` | Sortable table with empty state |
| `FilterSelect` | `components/workspace/FilterSelect.tsx` | Pill dropdown filters |
| `StatusBadge` | `components/workspace/StatusBadge.tsx` | Colored status pills |
| `FormField` | `components/workspace/FormField.tsx` | Labelled form inputs |
| `Button` | `components/ui/button.tsx` | shadcn button variants |
| `Sheet` | `components/ui/sheet.tsx` | Slide-over panels |

### Workspace data layer

All frontend modules share a single localStorage-backed data architecture:

```text
ensureSeedData()
  → getWorkspaceData()
  → storage mutation functions
  → notifyWorkspaceUpdated()
  → useWorkspaceData() hook re-renders
```

| Key | Value |
|---|---|
| `assetflow-workspace-v2` | Full workspace JSON (`WorkspaceData`) |
| `assetflow-seeded-v2` | Seed guard flag (prevents duplicate seeding) |
| `assetflow-theme` | Light/dark theme preference |

**`WorkspaceData` entities:**

| Entity | Description |
|---|---|
| `departments` | Organization departments |
| `categories` | Asset categories |
| `employees` | Staff records |
| `assets` | Asset registry |
| `allocations` | Active/historical allocations |
| `allocationHistory` | Timeline entries |
| `resources` | Bookable resources |
| `bookings` | Resource bookings |
| `maintenanceRequests` | Maintenance tickets |
| `auditCycles` | Audit cycle records |
| `auditChecklist` | Per-asset audit findings |
| `discrepancyReports` | Auto-generated discrepancy summaries |
| `notifications` | Workspace notifications |

**Storage API** (`frontend/src/lib/workspace/storage.ts`):

| Category | Functions |
|---|---|
| Organization | `upsertDepartment`, `deleteDepartment`, `upsertCategory`, `deleteCategory`, `upsertEmployee`, `deleteEmployee` |
| Assets | `upsertAsset`, `deleteAsset` |
| Allocations | `allocateAsset`, `submitTransferRequest`, `returnAsset`, `getActiveAllocation` |
| Bookings | `createBooking`, `deleteBooking`, `upsertResource`, `deleteResource` |
| Maintenance | `createMaintenanceRequest`, `updateMaintenanceStatus`, `deleteMaintenanceRequest` |
| Audits | `createAuditCycle`, `closeAuditCycle`, `addAuditChecklistItem`, `updateAuditVerification`, `getDiscrepancyReport`, `getOpenAuditCycle` |
| Notifications | `addNotification`, `markNotificationRead`, `markNotificationUnread`, `markAllNotificationsRead`, `removeNotification` |
| Seed | `ensureSeedData`, `getWorkspaceData` |

Types are defined in `frontend/src/lib/workspace/types.ts`. Utilities (CSV export, date formatting, deterministic hashes) live in `frontend/src/lib/workspace/utils.ts`.

### Frontend scripts

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npx tsc --noEmit # TypeScript check (no emit)
```

---

## Backend API

### Base URL and middleware

Default base URL: `http://localhost:8080`

Global middleware (all routes):
- Request ID
- Real IP
- Recoverer
- Request timeout (default 30s)

### Health check

#### `GET /health`

Public. No authentication required.

**Response `200`:**
```json
{
  "status": "ok"
}
```

---

### Department routes

All routes under `/api/v1/departments` require **Admin** authorization via the `RequireAdmin` middleware.

| Method | Path | Handler | Success | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/departments` | `Create` | **201** | Create a department |
| `GET` | `/api/v1/departments` | `List` | **200** | List all departments |
| `GET` | `/api/v1/departments/{id}` | `Get` | **200** | Get one department by UUID |
| `PATCH` | `/api/v1/departments/{id}` | `Update` | **200** | Update name, code, or parent |
| `PATCH` | `/api/v1/departments/{id}/status` | `UpdateStatus` | **200** | Activate or deactivate |

#### `POST /api/v1/departments`

Create a new department.

**Request body:**
```json
{
  "name": "Engineering",
  "code": "ENG",
  "parentId": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Unique (case-insensitive) |
| `code` | string | yes | Unique (stored uppercase) |
| `parentId` | UUID string or null | no | Parent department reference |

**Response `201`:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
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

#### `GET /api/v1/departments`

List all departments. Returns an empty array if none exist.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Engineering",
      "code": "ENG",
      "parentId": null,
      "parentName": null,
      "status": "active",
      "createdAt": "2026-07-12T10:30:00Z",
      "updatedAt": "2026-07-12T10:30:00Z"
    }
  ]
}
```

#### `GET /api/v1/departments/{id}`

Fetch a single department by UUID.

**Response `200`:** Same shape as create response.

**Response `404`:**
```json
{
  "error": {
    "code": "department_not_found",
    "message": "Department not found."
  }
}
```

#### `PATCH /api/v1/departments/{id}`

Partial update. All fields are optional.

**Request body examples:**
```json
{ "name": "Software Engineering" }
```
```json
{ "name": "Platform Engineering", "code": "PLAT", "parentId": null }
```

| `parentId` value | Behavior |
|---|---|
| Field omitted | Preserve current parent |
| `null` | Remove parent |
| UUID string | Assign new parent |

**Response `200`:** Updated department object.

#### `PATCH /api/v1/departments/{id}/status`

Toggle department status.

**Request body:**
```json
{
  "status": "inactive"
}
```

Allowed values: `"active"`, `"inactive"`.

**Response `200`:** Updated department object.

---

### Request and response formats

**Success envelope:**
```json
{
  "data": { ... }
}
```

**Error envelope:**
```json
{
  "error": {
    "code": "error_code_snake_case",
    "message": "Human-readable description."
  }
}
```

**Request constraints:**
- Content-Type: `application/json`
- Max body size: 1 MiB
- Unknown JSON fields are rejected
- Trailing JSON objects are rejected

### Error codes

| Code | HTTP status | When |
|---|---|---|
| `unauthorized` | 401 | No authenticated principal |
| `forbidden` | 403 | Authenticated but not admin |
| `invalid_request` | 400 | Malformed JSON or empty body |
| `invalid_input` | 400 | Validation failure |
| `invalid_status` | 400 | Status not active/inactive |
| `department_not_found` | 404 | Department UUID not found |
| `parent_department_not_found` | 404 | Parent UUID not found |
| `department_name_conflict` | 409 | Duplicate department name |
| `department_code_conflict` | 409 | Duplicate department code |
| `invalid_department_hierarchy` | 409 | Circular or invalid parent chain |
| `internal_error` | 500 | Unexpected server error |

### Authentication and authorization

The backend uses a **principal-based auth seam** in `backend/internal/api/auth.go`.

```go
type Principal struct {
    UserID        string
    Role          Role          // "admin" | "user"
    Authenticated bool
}
```

| Condition | Result |
|---|---|
| No principal in context | **401 Unauthorized** |
| Principal not authenticated | **401 Unauthorized** |
| Authenticated, non-admin role | **403 Forbidden** |
| Authenticated admin | Request proceeds |

**Current behavior:** No auth middleware injects a principal yet, so all `/api/v1/*` routes return **401** unless a principal is injected manually (e.g. in tests via `api.SetPrincipal`).

**Planned:** Supabase Auth JWT middleware will verify tokens and call `SetPrincipal` before `RequireAdmin`.

---

## Database

### Schema

The `departments` table is created by Goose migration `20260712060003_create_departments.sql`:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, auto-generated |
| `name` | TEXT | Unique (case-insensitive), not blank |
| `code` | TEXT | Unique (uppercase), not blank |
| `parent_id` | UUID (nullable) | Self-referencing FK, cycle-checked |
| `status` | `record_status` enum | `active` or `inactive` |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

**Constraints:**
- No self-parent
- No circular hierarchy (recursive trigger)
- Name and code normalization triggers

### Migrations

```bash
cd backend

# Apply
goose -dir sql/migrations postgres "$DATABASE_URL" up

# Status
goose -dir sql/migrations postgres "$DATABASE_URL" status

# Roll back
goose -dir sql/migrations postgres "$DATABASE_URL" down
```

### sqlc

```bash
cd backend
sqlc generate   # Regenerates internal/db/ — do not edit manually
```

---

## Environment variables

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `HTTP_PORT` | No | `8080` | HTTP listen port |
| `DATABASE_MIN_CONNS` | No | `2` | Minimum pool connections |
| `DATABASE_MAX_CONNS` | No | `10` | Maximum pool connections |
| `DATABASE_CONNECT_TIMEOUT` | No | `10s` | DB connect timeout (Go duration) |
| `HTTP_REQUEST_TIMEOUT` | No | `30s` | Per-request timeout |
| `HTTP_SHUTDOWN_TIMEOUT` | No | `15s` | Graceful shutdown wait |
| `ASSETFLOW_TEST_DATABASE_URL` | No | — | Isolated test DB (integration tests only) |

Copy the example file:
```bash
cp backend/.env.example backend/.env
```

### Frontend

No environment variables are required. The frontend uses localStorage and runs standalone.

Optional: configure API base URL when backend integration is added.

---

## Testing

### Backend

```bash
cd backend

# Unit and handler tests (no database required)
go test ./...

# Integration tests (requires isolated test database)
export ASSETFLOW_TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/assetflow_test"
go test ./...
```

### Frontend

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

---

## Integration status

| Module | Frontend | Backend API | Connected |
|---|---|---|---|
| Health check | — | `GET /health` | No |
| Departments | Organization setup (localStorage) | Full CRUD | **No** |
| Categories | Organization setup (localStorage) | Not implemented | No |
| Employees | Organization setup (localStorage) | Not implemented | No |
| Assets | Assets directory (localStorage) | Not implemented | No |
| Allocations | Allocation & Transfer (localStorage) | Not implemented | No |
| Bookings | Resource Booking (localStorage) | Not implemented | No |
| Maintenance | Maintenance board (localStorage) | Not implemented | No |
| Audits | Audit workspace (localStorage) | Not implemented | No |
| Reports | Reports dashboard (derived from localStorage) | Not implemented | No |
| Notifications | Notification center (localStorage) | Not implemented | No |
| Auth (login/signup) | UI screens only | Not implemented | No |

The frontend is a **fully interactive prototype** with persistent demo data. The backend is a **foundational API** ready for integration starting with departments.

---

## Contributing notes

- Do not edit `backend/internal/db/` manually — regenerate with `sqlc generate`.
- Do not run Goose migrations against a shared production database.
- Frontend workspace storage key: `assetflow-workspace-v2`. Changing the schema requires updating `normalizeWorkspace()` in `storage.ts` for backward compatibility.
- The `cmd/dbdoctor` CLI is temporary and should be removed once migrations are stable.
- Department head assignment (`head_id`) is deferred until the Employees backend module is merged.

---

## License

Built for Odoo Hackathon 2026.
