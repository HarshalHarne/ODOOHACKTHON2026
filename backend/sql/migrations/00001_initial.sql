-- +goose Up

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMs ────────────────────────────────────────────────────────────────────
-- All values lowercase to match existing service layer conventions.

CREATE TYPE employee_role AS ENUM (
    'admin',
    'asset_manager',
    'department_head',
    'employee'
);

CREATE TYPE employee_status     AS ENUM ('active', 'inactive');
CREATE TYPE department_status   AS ENUM ('active', 'inactive');
CREATE TYPE asset_category_status AS ENUM ('active', 'inactive');

-- ─── Shared updated_at trigger function ───────────────────────────────────────
-- One function, reused by every table trigger.

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPARTMENTS
-- Strongest schema taken from the v2 migration:
--   • code field (normalized UPPER)
--   • parent_id self-ref FK (hierarchy)
--   • cycle prevention via recursive CTE trigger
--   • normalization trigger (btrim name, upper code)
--   • CHECK constraints
--   • Functional unique indexes
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE departments (
    id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT                NOT NULL,
    code        TEXT                NOT NULL,
    parent_id   UUID                NULL,
    status      department_status   NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT departments_name_not_blank
        CHECK (btrim(name) <> ''),
    CONSTRAINT departments_code_not_blank
        CHECK (btrim(code) <> ''),
    CONSTRAINT departments_parent_not_self
        CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT departments_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX departments_name_lower_idx ON departments (lower(name));
CREATE UNIQUE INDEX departments_code_upper_idx ON departments (upper(code));
CREATE INDEX        departments_parent_id_idx  ON departments (parent_id);
CREATE INDEX        departments_status_idx     ON departments (status);

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION normalize_department_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name := btrim(NEW.name);
    NEW.code := upper(btrim(NEW.code));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION check_department_hierarchy_cycle()
RETURNS TRIGGER AS $$
BEGIN
    -- No parent → nothing to check.
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Direct self-reference is already caught by the CHECK constraint above,
    -- but we guard here too for clarity.
    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'A department cannot reference itself as parent'
            USING ERRCODE = '23514';
    END IF;

    -- Walk the ancestor chain upward from the proposed parent.
    -- If we encounter NEW.id in that chain, a cycle would be created.
    IF EXISTS (
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id, ARRAY[id] AS path
            FROM   departments
            WHERE  id = NEW.parent_id

            UNION ALL

            SELECT d.id, d.parent_id, a.path || d.id
            FROM   departments d
            JOIN   ancestors   a ON d.id = a.parent_id
            WHERE  NOT (d.id = ANY(a.path))   -- loop-guard
        )
        SELECT 1 FROM ancestors WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION
            'Hierarchy cycle detected: department % is an ancestor of the proposed parent %',
            NEW.id, NEW.parent_id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_normalize_departments
    BEFORE INSERT OR UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION normalize_department_fields();

CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_departments_cycle_check
    BEFORE INSERT OR UPDATE OF parent_id ON departments
    FOR EACH ROW
    WHEN (NEW.parent_id IS NOT NULL)
    EXECUTE FUNCTION check_department_hierarchy_cycle();

-- ═════════════════════════════════════════════════════════════════════════════
-- EMPLOYEES
-- Employee is both identity (password_hash, role) and org member
-- (department_id). No separate users table.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE employees (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(80)     NOT NULL,
    last_name       VARCHAR(80)     NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    department_id   UUID            NULL REFERENCES departments(id) ON DELETE SET NULL,
    role            employee_role   NOT NULL DEFAULT 'employee',
    status          employee_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_email      ON employees (email);
CREATE INDEX idx_employees_department ON employees (department_id);
CREATE INDEX idx_employees_role       ON employees (role);
CREATE INDEX idx_employees_status     ON employees (status);

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═════════════════════════════════════════════════════════════════════════════
-- ASSET CATEGORIES
-- dynamic_schema JSONB allows future category-specific field definitions
-- without schema migrations.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE asset_categories (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120)            NOT NULL,
    description     TEXT,
    dynamic_schema  JSONB                   NOT NULL DEFAULT '{}',
    status          asset_category_status   NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),

    CONSTRAINT asset_categories_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX asset_categories_name_lower_idx ON asset_categories (lower(name));
CREATE INDEX        asset_categories_status_idx     ON asset_categories (status);

CREATE TRIGGER trg_asset_categories_updated_at
    BEFORE UPDATE ON asset_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS trg_asset_categories_updated_at ON asset_categories;
DROP TRIGGER IF EXISTS trg_employees_updated_at         ON employees;
DROP TRIGGER IF EXISTS trg_departments_cycle_check      ON departments;
DROP TRIGGER IF EXISTS trg_departments_updated_at       ON departments;
DROP TRIGGER IF EXISTS trg_normalize_departments        ON departments;

DROP TABLE IF EXISTS asset_categories;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

DROP FUNCTION IF EXISTS check_department_hierarchy_cycle();
DROP FUNCTION IF EXISTS normalize_department_fields();
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TYPE IF EXISTS asset_category_status;
DROP TYPE IF EXISTS department_status;
DROP TYPE IF EXISTS employee_status;
DROP TYPE IF EXISTS employee_role;

DROP EXTENSION IF EXISTS pgcrypto;

-- +goose StatementEnd
