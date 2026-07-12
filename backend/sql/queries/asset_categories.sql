-- ─── Create ───────────────────────────────────────────────────────────────────

-- name: CreateCategory :one
INSERT INTO asset_categories (
    name,
    description,
    dynamic_schema,
    status
) VALUES (
    sqlc.arg(name),
    sqlc.arg(description),
    sqlc.arg(dynamic_schema),
    sqlc.arg(status)
)
RETURNING id, name, description, dynamic_schema, status, created_at, updated_at;

-- ─── Read ─────────────────────────────────────────────────────────────────────

-- name: GetCategoryByID :one
SELECT id, name, description, dynamic_schema, status, created_at, updated_at
FROM   asset_categories
WHERE  asset_categories.id = sqlc.arg(id);

-- name: ListCategories :many
SELECT id, name, description, dynamic_schema, status, created_at, updated_at
FROM   asset_categories
ORDER BY name ASC;

-- name: ListCategoriesByStatus :many
SELECT id, name, description, dynamic_schema, status, created_at, updated_at
FROM   asset_categories
WHERE  status = sqlc.arg(status)
ORDER BY name ASC;

-- ─── Update ───────────────────────────────────────────────────────────────────

-- name: UpdateCategory :one
UPDATE asset_categories
SET
    name           = sqlc.arg(name),
    description    = sqlc.arg(description),
    dynamic_schema = sqlc.arg(dynamic_schema)
WHERE asset_categories.id = sqlc.arg(id)
RETURNING id, name, description, dynamic_schema, status, created_at, updated_at;

-- name: UpdateCategoryStatus :one
UPDATE asset_categories
SET status = sqlc.arg(status)
WHERE asset_categories.id = sqlc.arg(id)
RETURNING id, name, description, dynamic_schema, status, created_at, updated_at;

-- ─── Existence checks ────────────────────────────────────────────────────────

-- name: CategoryNameExists :one
SELECT EXISTS (
    SELECT 1 FROM asset_categories WHERE lower(name) = lower(sqlc.arg(name))
);

-- name: CategoryNameExistsExcludingID :one
SELECT EXISTS (
    SELECT 1
    FROM   asset_categories
    WHERE  lower(name) = lower(sqlc.arg(name))
    AND    asset_categories.id <> sqlc.arg(id)
);
