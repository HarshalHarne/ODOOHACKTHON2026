-- +goose Up
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enum for record status
CREATE TYPE record_status AS ENUM ('active', 'inactive');

-- Create reusable function to update updated_at column
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- Create departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    parent_id UUID NULL,
    status record_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Explicitly named constraints
    CONSTRAINT departments_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT departments_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT departments_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT
);

-- Create normalization function
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

-- Create trigger for normalization
CREATE TRIGGER trg_normalize_departments
BEFORE INSERT OR UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION normalize_department_fields();

-- Create indexes
CREATE UNIQUE INDEX departments_name_lower_idx ON departments (lower(name));
CREATE UNIQUE INDEX departments_code_upper_idx ON departments (upper(code));
CREATE INDEX departments_parent_id_idx ON departments (parent_id);
CREATE INDEX departments_status_idx ON departments (status);

-- Create updated_at trigger
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create hierarchy-cycle function
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION check_department_hierarchy_cycle()
RETURNS TRIGGER AS $$
BEGIN
    -- return NEW immediately when NEW.parent_id is NULL
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- reject NEW.parent_id = NEW.id
    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'A department cannot directly reference itself as parent'
            USING ERRCODE = '23514';
    END IF;

    -- reject indirect cycles using a recursive CTE walking upwards
    -- track visited IDs in a path array to avoid infinite loop
    WITH RECURSIVE hierarchy AS (
        SELECT id, parent_id, ARRAY[id] AS path
        FROM departments
        WHERE id = NEW.parent_id

        UNION ALL

        SELECT d.id, d.parent_id, h.path || d.id
        FROM departments d
        INNER JOIN hierarchy h ON d.id = h.parent_id
        WHERE NOT (d.id = ANY(h.path))
    )
    IF EXISTS (
        SELECT 1 FROM hierarchy WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Hierarchy cycle detected: department % is a parent/ancestor of the proposed parent department %', NEW.id, NEW.parent_id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- Create hierarchy-cycle trigger
CREATE TRIGGER trg_departments_cycle_check
BEFORE INSERT OR UPDATE OF parent_id ON departments
FOR EACH ROW
WHEN (NEW.parent_id IS NOT NULL)
EXECUTE FUNCTION check_department_hierarchy_cycle();


-- +goose Down
DROP TRIGGER IF EXISTS trg_departments_cycle_check ON departments;
DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
DROP TRIGGER IF EXISTS trg_normalize_departments ON departments;

DROP TABLE IF EXISTS departments;

DROP FUNCTION IF EXISTS check_department_hierarchy_cycle();
DROP FUNCTION IF EXISTS normalize_department_fields();
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TYPE IF EXISTS record_status;
