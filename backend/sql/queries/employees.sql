-- ─── Create ───────────────────────────────────────────────────────────────────

-- name: CreateEmployee :one
INSERT INTO employees (
    first_name,
    last_name,
    email,
    password_hash,
    department_id,
    role,
    status
) VALUES (
    sqlc.arg(first_name),
    sqlc.arg(last_name),
    sqlc.arg(email),
    sqlc.arg(password_hash),
    sqlc.arg(department_id),
    sqlc.arg(role),
    sqlc.arg(status)
)
RETURNING
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at;

-- ─── Read ─────────────────────────────────────────────────────────────────────

-- name: GetEmployeeByID :one
SELECT
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at
FROM employees
WHERE employees.id = sqlc.arg(id);

-- name: GetEmployeeByEmail :one
SELECT
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at
FROM employees
WHERE email = sqlc.arg(email);

-- name: ListEmployees :many
SELECT
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at
FROM employees
ORDER BY last_name ASC, first_name ASC;

-- name: ListEmployeesByDepartment :many
SELECT
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at
FROM employees
WHERE department_id = sqlc.arg(department_id)
ORDER BY last_name ASC, first_name ASC;

-- name: ListEmployeesByRole :many
SELECT
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at
FROM employees
WHERE role = sqlc.arg(role)
ORDER BY last_name ASC, first_name ASC;

-- name: ListEmployeesByStatus :many
SELECT
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at
FROM employees
WHERE status = sqlc.arg(status)
ORDER BY last_name ASC, first_name ASC;

-- name: GetDepartmentHead :one
-- Returns the employee with role 'department_head' in the given department.
SELECT
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at
FROM employees
WHERE department_id = sqlc.arg(department_id)
  AND role = 'department_head'
  AND status = 'active'
LIMIT 1;

-- ─── Update ───────────────────────────────────────────────────────────────────

-- name: UpdateEmployee :one
UPDATE employees
SET
    first_name = sqlc.arg(first_name),
    last_name  = sqlc.arg(last_name),
    email      = sqlc.arg(email)
WHERE employees.id = sqlc.arg(id)
RETURNING
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at;

-- name: UpdateEmployeeStatus :one
UPDATE employees
SET status = sqlc.arg(status)
WHERE employees.id = sqlc.arg(id)
RETURNING
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at;

-- name: UpdateEmployeeRole :one
UPDATE employees
SET role = sqlc.arg(role)
WHERE employees.id = sqlc.arg(id)
RETURNING
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at;

-- name: AssignDepartment :one
UPDATE employees
SET department_id = sqlc.arg(department_id)
WHERE employees.id = sqlc.arg(id)
RETURNING
    id, first_name, last_name, email, password_hash,
    department_id, role, status, created_at, updated_at;

-- name: UpdatePasswordHash :exec
UPDATE employees
SET password_hash = sqlc.arg(password_hash)
WHERE employees.id = sqlc.arg(id);

-- ─── Existence checks ────────────────────────────────────────────────────────

-- name: EmployeeEmailExists :one
SELECT EXISTS (
    SELECT 1 FROM employees WHERE lower(email) = lower(sqlc.arg(email))
);

-- name: EmployeeEmailExistsExcludingID :one
SELECT EXISTS (
    SELECT 1
    FROM   employees
    WHERE  lower(email) = lower(sqlc.arg(email))
    AND    employees.id <> sqlc.arg(id)
);

-- ─── Delete & Count ──────────────────────────────────────────────────────────

-- name: DeleteEmployee :exec
DELETE FROM employees
WHERE id = sqlc.arg(id);

-- name: CountEmployees :one
SELECT COUNT(*) FROM employees;

-- name: CountEmployeesByStatus :one
SELECT COUNT(*) FROM employees WHERE status = sqlc.arg(status);
