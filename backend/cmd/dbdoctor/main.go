// cmd/dbdoctor/main.go
//
// Temporary database diagnostic CLI for AssetFlow.
// Inspects the public.departments table and optionally drops it when safe.
//
// Usage:
//
//	go run ./cmd/dbdoctor inspect
//	go run ./cmd/dbdoctor drop-empty-departments --confirm DROP_EMPTY_DEPARTMENTS
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const connectTimeout = 10 * time.Second
const opTimeout = 30 * time.Second

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	cmd := os.Args[1]
	switch cmd {
	case "inspect":
		if err := runInspect(); err != nil {
			fmt.Fprintf(os.Stderr, "inspect error: %v\n", err)
			os.Exit(1)
		}
	case "drop-empty-departments":
		confirmVal := ""
		for i := 2; i < len(os.Args)-1; i++ {
			if os.Args[i] == "--confirm" {
				confirmVal = os.Args[i+1]
			}
		}
		if err := runDropEmptyDepartments(confirmVal); err != nil {
			fmt.Fprintf(os.Stderr, "drop-empty-departments error: %v\n", err)
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %q\n", cmd)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("AssetFlow DB Doctor")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  inspect")
	fmt.Println("      Read-only inspection of public.departments and related objects.")
	fmt.Println()
	fmt.Println("  drop-empty-departments --confirm DROP_EMPTY_DEPARTMENTS")
	fmt.Println("      Drop public.departments only if it is empty and has no FK dependents.")
	fmt.Println()
	fmt.Println("Environment:")
	fmt.Println("  DATABASE_URL   PostgreSQL connection string (required)")
}

// newPool creates a connection pool from DATABASE_URL.
// The URL is never printed.
func newPool(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, errors.New("DATABASE_URL environment variable is not set")
	}
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}
	// Verify the connection is actually reachable.
	pingCtx, cancel := context.WithTimeout(ctx, connectTimeout)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	return pool, nil
}

// ── inspect ──────────────────────────────────────────────────────────────────

func runInspect() error {
	ctx := context.Background()

	pool, err := newPool(ctx)
	if err != nil {
		return err
	}
	defer pool.Close()

	opCtx, cancel := context.WithTimeout(ctx, opTimeout)
	defer cancel()

	conn, err := pool.Acquire(opCtx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println(" AssetFlow DB Doctor — Inspect")
	fmt.Println("═══════════════════════════════════════════════════════")

	if err := inspectDepartmentsTable(opCtx, conn.Conn()); err != nil {
		return err
	}

	fmt.Println()
	if err := inspectSharedObjects(opCtx, conn.Conn()); err != nil {
		return err
	}

	fmt.Println()
	if err := inspectGooseVersions(opCtx, conn.Conn()); err != nil {
		return err
	}

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println(" Inspect complete (read-only — no changes made)")
	fmt.Println("═══════════════════════════════════════════════════════")
	return nil
}

func inspectDepartmentsTable(ctx context.Context, conn *pgx.Conn) error {
	// ── existence and relation type ──────────────────────────────────────────
	var relkind string
	err := conn.QueryRow(ctx, `
		SELECT relkind
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public' AND c.relname = 'departments'
	`).Scan(&relkind)

	if errors.Is(err, pgx.ErrNoRows) {
		fmt.Println("\n▶ public.departments: DOES NOT EXIST")
		return nil
	}
	if err != nil {
		return fmt.Errorf("checking departments existence: %w", err)
	}

	relkindName := map[string]string{
		"r": "ordinary table",
		"v": "view",
		"m": "materialized view",
		"f": "foreign table",
		"p": "partitioned table",
	}
	typeName, ok := relkindName[relkind]
	if !ok {
		typeName = relkind
	}

	fmt.Printf("\n▶ public.departments: EXISTS (relation type: %s)\n", typeName)

	// ── row count ────────────────────────────────────────────────────────────
	var rowCount int64
	if err := conn.QueryRow(ctx, `SELECT COUNT(*) FROM public.departments`).Scan(&rowCount); err != nil {
		return fmt.Errorf("counting rows: %w", err)
	}
	fmt.Printf("  Row count : %d\n", rowCount)

	// ── columns ──────────────────────────────────────────────────────────────
	fmt.Println("\n── Columns ─────────────────────────────────────────────")
	colRows, err := conn.Query(ctx, `
		SELECT
			a.attname                              AS column_name,
			pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
			NOT a.attnotnull                       AS is_nullable,
			COALESCE(pg_get_expr(d.adbin, d.adrelid), '')   AS column_default
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
		WHERE n.nspname = 'public'
		  AND c.relname = 'departments'
		  AND a.attnum > 0
		  AND NOT a.attisdropped
		ORDER BY a.attnum
	`)
	if err != nil {
		return fmt.Errorf("querying columns: %w", err)
	}
	defer colRows.Close()

	fmt.Printf("  %-20s %-30s %-10s %s\n", "NAME", "TYPE", "NULLABLE", "DEFAULT")
	fmt.Printf("  %-20s %-30s %-10s %s\n", "────────────────────", "──────────────────────────────", "────────", "─────────────────")
	for colRows.Next() {
		var colName, dataType, colDefault string
		var isNullable bool
		if err := colRows.Scan(&colName, &dataType, &isNullable, &colDefault); err != nil {
			return fmt.Errorf("scanning column row: %w", err)
		}
		nullStr := "NO"
		if isNullable {
			nullStr = "YES"
		}
		defStr := colDefault
		if defStr == "" {
			defStr = "(none)"
		}
		fmt.Printf("  %-20s %-30s %-10s %s\n", colName, dataType, nullStr, defStr)
	}
	if err := colRows.Err(); err != nil {
		return fmt.Errorf("iterating column rows: %w", err)
	}

	// ── constraints ──────────────────────────────────────────────────────────
	fmt.Println("\n── Constraints ─────────────────────────────────────────")
	conRows, err := conn.Query(ctx, `
		SELECT
			con.conname,
			con.contype,
			pg_get_constraintdef(con.oid, true) AS def
		FROM pg_constraint con
		JOIN pg_class rel ON rel.oid = con.conrelid
		JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
		WHERE nsp.nspname = 'public'
		  AND rel.relname = 'departments'
		ORDER BY con.contype, con.conname
	`)
	if err != nil {
		return fmt.Errorf("querying constraints: %w", err)
	}
	defer conRows.Close()

	conTypeMap := map[string]string{
		"c": "CHECK",
		"f": "FOREIGN KEY",
		"p": "PRIMARY KEY",
		"u": "UNIQUE",
		"t": "TRIGGER",
		"x": "EXCLUSION",
	}
	found := false
	for conRows.Next() {
		found = true
		var name, contype, def string
		if err := conRows.Scan(&name, &contype, &def); err != nil {
			return fmt.Errorf("scanning constraint row: %w", err)
		}
		typLabel := conTypeMap[contype]
		if typLabel == "" {
			typLabel = contype
		}
		fmt.Printf("  [%-12s] %s\n", typLabel, name)
		fmt.Printf("              %s\n", def)
	}
	if !found {
		fmt.Println("  (no constraints found)")
	}
	if err := conRows.Err(); err != nil {
		return fmt.Errorf("iterating constraint rows: %w", err)
	}

	// ── indexes ──────────────────────────────────────────────────────────────
	fmt.Println("\n── Indexes ─────────────────────────────────────────────")
	idxRows, err := conn.Query(ctx, `
		SELECT
			i.relname AS index_name,
			ix.indisunique,
			pg_get_indexdef(ix.indexrelid) AS def
		FROM pg_index ix
		JOIN pg_class i ON i.oid = ix.indexrelid
		JOIN pg_class t ON t.oid = ix.indrelid
		JOIN pg_namespace n ON n.oid = t.relnamespace
		WHERE n.nspname = 'public'
		  AND t.relname = 'departments'
		ORDER BY i.relname
	`)
	if err != nil {
		return fmt.Errorf("querying indexes: %w", err)
	}
	defer idxRows.Close()

	found = false
	for idxRows.Next() {
		found = true
		var idxName, def string
		var isUnique bool
		if err := idxRows.Scan(&idxName, &isUnique, &def); err != nil {
			return fmt.Errorf("scanning index row: %w", err)
		}
		uniqueStr := ""
		if isUnique {
			uniqueStr = " [UNIQUE]"
		}
		fmt.Printf("  %s%s\n    %s\n", idxName, uniqueStr, def)
	}
	if !found {
		fmt.Println("  (no indexes found)")
	}
	if err := idxRows.Err(); err != nil {
		return fmt.Errorf("iterating index rows: %w", err)
	}

	// ── inbound FK dependencies ───────────────────────────────────────────────
	fmt.Println("\n── Inbound FK dependencies (tables referencing departments) ─")
	depRows, err := conn.Query(ctx, `
		SELECT
			src_ns.nspname  AS src_schema,
			src_rel.relname AS src_table,
			con.conname     AS fk_name,
			pg_get_constraintdef(con.oid, true) AS fk_def
		FROM pg_constraint con
		JOIN pg_class src_rel ON src_rel.oid = con.conrelid
		JOIN pg_namespace src_ns ON src_ns.oid = src_rel.relnamespace
		JOIN pg_class ref_rel ON ref_rel.oid = con.confrelid
		JOIN pg_namespace ref_ns ON ref_ns.oid = ref_rel.relnamespace
		WHERE con.contype = 'f'
		  AND ref_ns.nspname = 'public'
		  AND ref_rel.relname = 'departments'
		ORDER BY src_ns.nspname, src_rel.relname
	`)
	if err != nil {
		return fmt.Errorf("querying inbound FKs: %w", err)
	}
	defer depRows.Close()

	found = false
	for depRows.Next() {
		found = true
		var srcSchema, srcTable, fkName, fkDef string
		if err := depRows.Scan(&srcSchema, &srcTable, &fkName, &fkDef); err != nil {
			return fmt.Errorf("scanning inbound FK row: %w", err)
		}
		fmt.Printf("  %s.%s  →  constraint %s\n    %s\n", srcSchema, srcTable, fkName, fkDef)
	}
	if !found {
		fmt.Println("  (none — no other table references departments)")
	}
	if err := depRows.Err(); err != nil {
		return fmt.Errorf("iterating inbound FK rows: %w", err)
	}

	return nil
}

func inspectSharedObjects(ctx context.Context, conn *pgx.Conn) error {
	fmt.Println("── Shared objects ──────────────────────────────────────")

	// record_status enum
	var enumExists bool
	if err := conn.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM pg_type t
			JOIN pg_namespace n ON n.oid = t.typnamespace
			WHERE n.nspname = 'public' AND t.typname = 'record_status' AND t.typtype = 'e'
		)
	`).Scan(&enumExists); err != nil {
		return fmt.Errorf("checking record_status: %w", err)
	}
	printExistence("  TYPE   record_status", enumExists)

	// Functions
	funcs := []struct {
		label string
		name  string
	}{
		{"  FUNC   update_updated_at_column()", "update_updated_at_column"},
		{"  FUNC   normalize_department_fields()", "normalize_department_fields"},
		{"  FUNC   check_department_hierarchy_cycle()", "check_department_hierarchy_cycle"},
	}
	for _, f := range funcs {
		var exists bool
		if err := conn.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM pg_proc p
				JOIN pg_namespace n ON n.oid = p.pronamespace
				WHERE n.nspname = 'public' AND p.proname = $1
			)
		`, f.name).Scan(&exists); err != nil {
			return fmt.Errorf("checking function %s: %w", f.name, err)
		}
		printExistence(f.label, exists)
	}

	return nil
}

func printExistence(label string, exists bool) {
	status := "✗ MISSING"
	if exists {
		status = "✓ EXISTS"
	}
	fmt.Printf("  %-45s %s\n", label, status)
}

func inspectGooseVersions(ctx context.Context, conn *pgx.Conn) error {
	fmt.Println("── Goose migration history ─────────────────────────────")

	// Check if goose_db_version table exists first
	var tableExists bool
	if err := conn.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = 'public' AND c.relname = 'goose_db_version'
		)
	`).Scan(&tableExists); err != nil {
		return fmt.Errorf("checking goose_db_version: %w", err)
	}

	if !tableExists {
		fmt.Println("  goose_db_version table: DOES NOT EXIST (no migrations applied yet)")
		return nil
	}

	rows, err := conn.Query(ctx, `
		SELECT id, version_id, is_applied, tstamp
		FROM public.goose_db_version
		ORDER BY id DESC
		LIMIT 20
	`)
	if err != nil {
		return fmt.Errorf("querying goose versions: %w", err)
	}
	defer rows.Close()

	fmt.Printf("  %-6s %-15s %-12s %s\n", "ID", "VERSION_ID", "IS_APPLIED", "TIMESTAMP")
	fmt.Printf("  %-6s %-15s %-12s %s\n", "──────", "───────────────", "────────────", "──────────────────────")
	found := false
	for rows.Next() {
		found = true
		var id, versionID int64
		var isApplied bool
		var ts time.Time
		if err := rows.Scan(&id, &versionID, &isApplied, &ts); err != nil {
			return fmt.Errorf("scanning goose row: %w", err)
		}
		fmt.Printf("  %-6d %-15d %-12v %s\n", id, versionID, isApplied, ts.Format(time.RFC3339))
	}
	if !found {
		fmt.Println("  (goose_db_version is empty)")
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterating goose rows: %w", err)
	}

	return nil
}

// ── drop-empty-departments ────────────────────────────────────────────────────

const requiredConfirmation = "DROP_EMPTY_DEPARTMENTS"

func runDropEmptyDepartments(confirmVal string) error {
	if confirmVal != requiredConfirmation {
		return fmt.Errorf(
			"safety check failed: --confirm value must be exactly %q (got %q)",
			requiredConfirmation, confirmVal,
		)
	}

	ctx := context.Background()

	pool, err := newPool(ctx)
	if err != nil {
		return err
	}
	defer pool.Close()

	opCtx, cancel := context.WithTimeout(ctx, opTimeout)
	defer cancel()

	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println(" AssetFlow DB Doctor — drop-empty-departments")
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println()

	conn, err := pool.Acquire(opCtx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	// Begin transaction
	tx, err := conn.BeginTx(opCtx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	committed := false
	defer func() {
		if !committed {
			fmt.Println("\n  Rolling back transaction...")
			if rbErr := tx.Rollback(ctx); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) {
				fmt.Fprintf(os.Stderr, "  rollback error: %v\n", rbErr)
			} else {
				fmt.Println("  Transaction rolled back. No changes made.")
			}
		}
	}()

	// Step 1: Check departments exists
	fmt.Print("  [1/5] Checking public.departments exists... ")
	var relkind string
	err = tx.QueryRow(opCtx, `
		SELECT relkind
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public' AND c.relname = 'departments'
	`).Scan(&relkind)
	if errors.Is(err, pgx.ErrNoRows) {
		fmt.Println("NOT FOUND")
		return errors.New("public.departments does not exist — nothing to drop")
	}
	if err != nil {
		return fmt.Errorf("checking existence: %w", err)
	}
	fmt.Println("EXISTS ✓")

	// Step 2: Lock the table in ACCESS EXCLUSIVE mode
	fmt.Print("  [2/5] Acquiring ACCESS EXCLUSIVE lock... ")
	if _, err := tx.Exec(opCtx, `LOCK TABLE public.departments IN ACCESS EXCLUSIVE MODE`); err != nil {
		return fmt.Errorf("failed to lock table: %w", err)
	}
	fmt.Println("acquired ✓")

	// Step 3: Count rows (inside the lock)
	fmt.Print("  [3/5] Counting rows after lock... ")
	var rowCount int64
	if err := tx.QueryRow(opCtx, `SELECT COUNT(*) FROM public.departments`).Scan(&rowCount); err != nil {
		return fmt.Errorf("counting rows: %w", err)
	}
	fmt.Printf("%d rows\n", rowCount)
	if rowCount > 0 {
		return fmt.Errorf(
			"ABORTED: public.departments contains %d row(s) — drop manually after clearing data",
			rowCount,
		)
	}

	// Step 4: Check inbound FK dependencies
	fmt.Print("  [4/5] Checking inbound FK dependencies... ")
	depRows, err := tx.Query(opCtx, `
		SELECT src_rel.relname
		FROM pg_constraint con
		JOIN pg_class src_rel ON src_rel.oid = con.conrelid
		JOIN pg_class ref_rel ON ref_rel.oid = con.confrelid
		JOIN pg_namespace ref_ns ON ref_ns.oid = ref_rel.relnamespace
		WHERE con.contype = 'f'
		  AND ref_ns.nspname = 'public'
		  AND ref_rel.relname = 'departments'
	`)
	if err != nil {
		return fmt.Errorf("querying FK dependencies: %w", err)
	}

	var dependents []string
	for depRows.Next() {
		var tableName string
		if err := depRows.Scan(&tableName); err != nil {
			depRows.Close()
			return fmt.Errorf("scanning dependent table: %w", err)
		}
		dependents = append(dependents, tableName)
	}
	depRows.Close()
	if err := depRows.Err(); err != nil {
		return fmt.Errorf("iterating FK dependencies: %w", err)
	}

	if len(dependents) > 0 {
		fmt.Printf("BLOCKED\n")
		fmt.Println("  ABORTED: the following tables reference public.departments via foreign key:")
		for _, t := range dependents {
			fmt.Printf("    - %s\n", t)
		}
		return errors.New("cannot drop departments while foreign-key dependents exist")
	}
	fmt.Println("none ✓")

	// Step 5: Drop the table (RESTRICT — never CASCADE)
	fmt.Print("  [5/5] Dropping public.departments RESTRICT... ")
	if _, err := tx.Exec(opCtx, `DROP TABLE public.departments RESTRICT`); err != nil {
		return fmt.Errorf("dropping table: %w", err)
	}
	fmt.Println("dropped ✓")

	// Commit
	fmt.Print("\n  Committing transaction... ")
	if err := tx.Commit(opCtx); err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}
	committed = true
	fmt.Println("committed ✓")

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println(" public.departments dropped successfully.")
	fmt.Println(" record_status, trigger functions, and Goose metadata")
	fmt.Println(" were NOT touched.")
	fmt.Println(" You can now run: goose -dir sql/migrations postgres $DATABASE_URL up")
	fmt.Println("═══════════════════════════════════════════════════════")
	return nil
}
