package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nexus/backend/internal/domain"
)

// AgentRepo is the PostgreSQL implementation of domain.AgentRepository.
type AgentRepo struct{ db *DB }

func NewAgentRepo(db *DB) *AgentRepo { return &AgentRepo{db: db} }

const agentCols = `id, tenant_id, version, hostname, status, last_heartbeat, registered_at`

func scanAgent(row pgx.Row) (*domain.Agent, error) {
	var a domain.Agent
	err := row.Scan(
		&a.ID, &a.TenantID, &a.Version,
		&a.Hostname, &a.Status,
		&a.LastHeartbeat, &a.RegisteredAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AgentRepo) FindByTenant(ctx context.Context, tenantID string) (*domain.Agent, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT `+agentCols+` FROM agents WHERE tenant_id=$1`, tenantID)
	a, err := scanAgent(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("agent for tenant %q not found", tenantID)
	}
	return a, err
}

func (r *AgentRepo) Upsert(ctx context.Context, a *domain.Agent) error {
	if a.RegisteredAt.IsZero() {
		a.RegisteredAt = time.Now().UTC()
	}
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO agents (id, tenant_id, version, hostname, status, last_heartbeat, registered_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (tenant_id) DO UPDATE
		SET version=$3, hostname=$4, status=$5, last_heartbeat=$6`,
		a.ID, a.TenantID, a.Version, a.Hostname, a.Status,
		a.LastHeartbeat, a.RegisteredAt)
	return err
}
