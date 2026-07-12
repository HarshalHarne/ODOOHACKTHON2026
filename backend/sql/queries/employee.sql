-- name: CreateEmployee :one
INSERT INTO employees (
    first_name,
    last_name,
    email,
    phone,
    department_id,
    job_title,
    status,
    hire_date
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: GetEmployeeByID :one
SELECT * FROM employees
WHERE id = $1
LIMIT 1;

-- name: GetEmployeeByEmail :one
SELECT * FROM employees
WHERE email = $1
LIMIT 1;

-- name: ListEmployees :many
SELECT * FROM employees
ORDER BY last_name ASC, first_name ASC;

-- name: ListEmployeesByDepartment :many
SELECT * FROM employees
WHERE department_id = $1
ORDER BY last_name ASC, first_name ASC;

-- name: ListEmployeesByStatus :many
SELECT * FROM employees
WHERE status = $1
ORDER BY last_name ASC, first_name ASC;

-- name: UpdateEmployee :one
UPDATE employees SET
    first_name    = $2,
    last_name     = $3,
    email         = $4,
    phone         = $5,
    department_id = $6,
    job_title     = $7,
    status        = $8,
    hire_date     = $9,
    updated_at    = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateEmployeeStatus :one
UPDATE employees SET
    status     = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteEmployee :exec
DELETE FROM employees
WHERE id = $1;

-- name: CountEmployees :one
SELECT COUNT(*) FROM employees;

-- name: CountEmployeesByStatus :one
SELECT COUNT(*) FROM employees
WHERE status = $1;
