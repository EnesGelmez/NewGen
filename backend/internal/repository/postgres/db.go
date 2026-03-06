// Package postgres provides PostgreSQL implementations of all domain repositories
// using the pgx/v5 connection pool.
package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps a pgxpool.Pool so we have a single shared handle.
type DB struct {
	Pool *pgxpool.Pool
}

// New opens a connection pool using the provided connection string.
// Returns an error if the pool cannot be established or the ping fails.
func New(ctx context.Context, connString string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("postgres: parse config: %w", err)
	}
	cfg.MaxConns = 20
	cfg.MinConns = 2

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("postgres: create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("postgres: ping: %w", err)
	}
	db := &DB{Pool: pool}
	if err := db.migrate(ctx); err != nil {
		return nil, fmt.Errorf("postgres: migrate: %w", err)
	}
	return db, nil
}

// migrate applies incremental schema changes that may not have been included
// in the original Docker init scripts (e.g. columns added in later migrations).
func (db *DB) migrate(ctx context.Context) error {
	stmts := []string{
		// 003: per-tenant incoming webhook API key
		`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_key TEXT NOT NULL DEFAULT ''`,
		`UPDATE tenants SET api_key = 'ngk-' || gen_random_uuid()::text WHERE api_key = ''`,
	}
	for _, s := range stmts {
		if _, err := db.Pool.Exec(ctx, s); err != nil {
			return fmt.Errorf("migrate stmt %q: %w", s[:min(40, len(s))], err)
		}
	}
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Close releases all connections in the pool.
func (db *DB) Close() {
	db.Pool.Close()
}
