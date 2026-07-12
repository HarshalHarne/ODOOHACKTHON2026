-- name: CreateDepartment :one
WITH inserted AS (
    INSERT INTO departments (
        name, code, parent_id
    ) VALUES (
        sqlc.arg(name), sqlc.arg(code), sqlc.arg(parent_id)
    )
    RETURNING id, name, code, parent_id, status, created_at, updated_at
)
SELECT 
    i.id,
    i.name,
    i.code,
    i.parent_id,
    i.status,
    i.created_at,
    i.updated_at,
    parent.name AS parent_name
FROM inserted i
LEFT JOIN departments parent ON parent.id = i.parent_id;

-- name: GetDepartmentByID :one
SELECT 
    d.id,
    d.name,
    d.code,
    d.parent_id,
    d.status,
    d.created_at,
    d.updated_at,
    parent.name AS parent_name
FROM departments d
LEFT JOIN departments parent ON parent.id = d.parent_id
WHERE d.id = $1;

-- name: ListDepartments :many
SELECT 
    d.id,
    d.name,
    d.code,
    d.parent_id,
    d.status,
    d.created_at,
    d.updated_at,
    parent.name AS parent_name
FROM departments d
LEFT JOIN departments parent ON parent.id = d.parent_id
ORDER BY d.name ASC, d.id ASC;

-- name: UpdateDepartment :one
WITH updated AS (
    UPDATE departments
    SET 
        name = sqlc.arg(name),
        code = sqlc.arg(code),
        parent_id = sqlc.arg(parent_id)
    WHERE departments.id = sqlc.arg(id)
    RETURNING id, name, code, parent_id, status, created_at, updated_at
)
SELECT 
    u.id,
    u.name,
    u.code,
    u.parent_id,
    u.status,
    u.created_at,
    u.updated_at,
    parent.name AS parent_name
FROM updated u
LEFT JOIN departments parent ON parent.id = u.parent_id;

-- name: UpdateDepartmentStatus :one
WITH updated AS (
    UPDATE departments
    SET 
        status = sqlc.arg(status)
    WHERE departments.id = sqlc.arg(id)
    RETURNING id, name, code, parent_id, status, created_at, updated_at
)
SELECT 
    u.id,
    u.name,
    u.code,
    u.parent_id,
    u.status,
    u.created_at,
    u.updated_at,
    parent.name AS parent_name
FROM updated u
LEFT JOIN departments parent ON parent.id = u.parent_id;

-- name: DepartmentNameExists :one
SELECT EXISTS (
    SELECT 1 FROM departments WHERE lower(name) = lower(sqlc.arg(name))
);

-- name: DepartmentCodeExists :one
SELECT EXISTS (
    SELECT 1 FROM departments WHERE lower(code) = lower(sqlc.arg(code))
);

-- name: DepartmentNameExistsExcludingID :one
SELECT EXISTS (
    SELECT 1 
    FROM departments 
    WHERE lower(name) = lower(sqlc.arg(name)) AND id <> sqlc.arg(id)
);

-- name: DepartmentCodeExistsExcludingID :one
SELECT EXISTS (
    SELECT 1 
    FROM departments 
    WHERE lower(code) = lower(sqlc.arg(code)) AND id <> sqlc.arg(id)
);

-- name: ParentDepartmentExists :one
SELECT EXISTS (
    SELECT 1 FROM departments WHERE id = sqlc.arg(parent_id)
);
