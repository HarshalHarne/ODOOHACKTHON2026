# AssetFlow Backend

Go REST API for AssetFlow, built with chi/v5, pgx/v5, Goose, and sqlc.

## Project Status

This repository contains the backend foundation for AssetFlow. The implemented components include the initial database schema, Department module, authentication foundation, SQL query generation with sqlc, and REST API scaffolding. Additional ERP modules (Assets, Allocation, Booking, Maintenance, Audit, and Reporting) are planned but are not yet implemented.

## Architecture

The project is structured into specific domains and functional areas:

- `cmd/api/`: Application entry point. Loads configuration, wires dependencies, and starts the server.
- `cmd/dbdoctor/`: CLI tool for database inspection.
- `internal/api/`: HTTP layer containing the Chi router, middleware, and request handlers.
- `internal/config/`: Environment-based configuration loader.
- `internal/core/`: Domain types, business logic, and services (e.g., `DepartmentService`).
- `internal/database/`: PostgreSQL connection pool management using pgx.
- `internal/db/`: Auto-generated database access code by sqlc.
- `sql/migrations/`: Database schema definitions managed by Goose.
- `sql/queries/`: SQL queries used by sqlc to generate access methods.

## Database

The database is PostgreSQL, managed via Goose migrations. 

### Current Schema
Currently, only the **Departments** domain is implemented. 
- **`departments`**: Stores organization departments with a hierarchical structure (self-referencing `parent_id`). It enforces rules against circular dependencies using database triggers.
- **Enums**: `record_status` (values: `active`, `inactive`).

## Database Operations (SQLC)

The following database operations are currently supported by the generated `internal/db` code:
- **CreateDepartment**: Inserts a new department.
- **GetDepartmentByID**: Fetches a single department and its parent's name.
- **ListDepartments**: Retrieves all departments ordered by name.
- **UpdateDepartment**: Modifies a department's name, code, or parent.
- **UpdateDepartmentStatus**: Modifies only the `status` of a department.
- Existence checks (`DepartmentNameExists`, `DepartmentCodeExists`, `ParentDepartmentExists`, etc.)

## API Endpoints

### Public Routes
- `GET /health`: Health check endpoint.

### Admin Routes
All routes below are prefixed with `/api/v1` and require an Admin principal.

- `GET /departments`: List all departments.
- `POST /departments`: Create a new department.
- `GET /departments/{id}`: Get a specific department by ID.
- `PATCH /departments/{id}`: Update department details.
- `PATCH /departments/{id}/status`: Update department status (active/inactive).

## Authentication & Authorization

Authorization is handled via a custom `RequireAdmin` middleware on the `/api/v1/*` routes.
- The middleware expects a `Principal` object in the request context with a role of `admin`.
- Currently, there is no active JWT validation or login endpoint. The middleware acts as an authorization seam for future integration.

## Configuration

The application is configured using the following environment variables:

- `DATABASE_URL` *(Required)*: Connection string for PostgreSQL.
- `HTTP_PORT`: Port for the API server (default: `8080`).
- `DATABASE_MIN_CONNS`: Minimum database connections (default: `2`).
- `DATABASE_MAX_CONNS`: Maximum database connections (default: `10`).
- `DATABASE_CONNECT_TIMEOUT`: Timeout for database connection (default: `10s`).
- `HTTP_REQUEST_TIMEOUT`: Global HTTP request timeout (default: `30s`).
- `HTTP_SHUTDOWN_TIMEOUT`: Graceful shutdown timeout (default: `15s`).

## Running the Project

To build and run the backend locally, use the following commands:

Ensure to update the `.env` file first.

```bash
cp .env.example .env

# Update the .env file with your database credentials
```

1. Install dependencies:
   ```bash
   go mod tidy
   ```
2. Generate SQLC models and queries (requires sqlc CLI):
   ```bash
   sqlc generate
   ```
3. Run database migrations (requires goose CLI and `DATABASE_URL`):
   ```bash
   goose up
   ```
4. Start the API server:
   ```bash
   go run ./cmd/api
   ```
