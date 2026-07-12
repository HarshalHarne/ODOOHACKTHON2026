-- +goose Up
-- +goose StatementBegin

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Lookup / reference tables ────────────────────────────────────────────────

CREATE TABLE departments (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(120) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(120) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Employee ─────────────────────────────────────────────────────────────────

CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on_leave', 'terminated');

CREATE TABLE employees (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name      VARCHAR(80)     NOT NULL,
    last_name       VARCHAR(80)     NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    phone           VARCHAR(20),
    department_id   UUID            REFERENCES departments(id) ON DELETE SET NULL,
    job_title       VARCHAR(120),
    status          employee_status NOT NULL DEFAULT 'active',
    hire_date       DATE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status     ON employees(status);
CREATE INDEX idx_employees_email      ON employees(email);

-- ─── Assets ───────────────────────────────────────────────────────────────────

CREATE TYPE asset_status AS ENUM ('available', 'assigned', 'under_maintenance', 'retired', 'lost');
CREATE TYPE asset_condition AS ENUM ('new', 'good', 'fair', 'poor', 'damaged');

CREATE TABLE assets (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255)    NOT NULL,
    asset_tag       VARCHAR(80)     NOT NULL UNIQUE,
    serial_number   VARCHAR(120),
    category_id     UUID            REFERENCES categories(id) ON DELETE SET NULL,
    department_id   UUID            REFERENCES departments(id) ON DELETE SET NULL,
    assigned_to     UUID            REFERENCES employees(id) ON DELETE SET NULL,
    status          asset_status    NOT NULL DEFAULT 'available',
    condition       asset_condition NOT NULL DEFAULT 'new',
    purchase_date   DATE,
    purchase_cost   NUMERIC(12, 2),
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_category    ON assets(category_id);
CREATE INDEX idx_assets_department  ON assets(department_id);
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX idx_assets_status      ON assets(status);
CREATE INDEX idx_assets_asset_tag   ON assets(asset_tag);

-- ─── Users (auth) ─────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');

CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role   NOT NULL DEFAULT 'viewer',
    employee_id     UUID        REFERENCES employees(id) ON DELETE SET NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);

-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS departments;

DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS asset_condition;
DROP TYPE IF EXISTS asset_status;
DROP TYPE IF EXISTS employee_status;

-- +goose StatementEnd
