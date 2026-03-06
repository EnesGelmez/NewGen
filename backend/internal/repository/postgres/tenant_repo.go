package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nexus/backend/internal/domain"
)

// TenantRepo is the PostgreSQL implementation of domain.TenantRepository.
type TenantRepo struct{ db *DB }

func NewTenantRepo(db *DB) *TenantRepo { return &TenantRepo{db: db} }

func (r *TenantRepo) FindAll(ctx context.Context) ([]domain.Tenant, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, subdomain, email, status, plan, api_key, agent_token, created_at, updated_at
		FROM tenants ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("tenants FindAll: %w", err)
	}
	defer rows.Close()

	var out []domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Subdomain, &t.Email,
			&t.Status, &t.Plan, &t.APIKey, &t.AgentToken, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *TenantRepo) FindByID(ctx context.Context, id string) (*domain.Tenant, error) {
	var t domain.Tenant
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, name, subdomain, email, status, plan, api_key, agent_token, created_at, updated_at
		FROM tenants WHERE id = $1`, id).
		Scan(&t.ID, &t.Name, &t.Subdomain, &t.Email,
			&t.Status, &t.Plan, &t.APIKey, &t.AgentToken, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("tenant %q not found", id)
	}
	return &t, err
}

func (r *TenantRepo) FindBySubdomain(ctx context.Context, subdomain string) (*domain.Tenant, error) {
	var t domain.Tenant
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, name, subdomain, email, status, plan, api_key, agent_token, created_at, updated_at
		FROM tenants WHERE subdomain = $1`, subdomain).
		Scan(&t.ID, &t.Name, &t.Subdomain, &t.Email,
			&t.Status, &t.Plan, &t.APIKey, &t.AgentToken, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("tenant %q not found", subdomain)
	}
	return &t, err
}

func (r *TenantRepo) FindByAPIKey(ctx context.Context, apiKey string) (*domain.Tenant, error) {
	var t domain.Tenant
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, name, subdomain, email, status, plan, api_key, agent_token, created_at, updated_at
		FROM tenants WHERE api_key = $1`, apiKey).
		Scan(&t.ID, &t.Name, &t.Subdomain, &t.Email,
			&t.Status, &t.Plan, &t.APIKey, &t.AgentToken, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("invalid API key")
	}
	return &t, err
}

func (r *TenantRepo) Create(ctx context.Context, t *domain.Tenant) error {
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO tenants (id, name, subdomain, email, status, plan, api_key, agent_token, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		t.ID, t.Name, t.Subdomain, t.Email, t.Status, t.Plan, t.APIKey, t.AgentToken, t.CreatedAt, t.UpdatedAt)
	return err
}

func (r *TenantRepo) Update(ctx context.Context, t *domain.Tenant) error {
	t.UpdatedAt = time.Now().UTC()
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE tenants SET name=$2, subdomain=$3, email=$4, status=$5, plan=$6,
		agent_token=$7, updated_at=$8 WHERE id=$1`,
		t.ID, t.Name, t.Subdomain, t.Email, t.Status, t.Plan, t.AgentToken, t.UpdatedAt)
	return err
}

func (r *TenantRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM tenants WHERE id=$1`, id)
	return err
}
