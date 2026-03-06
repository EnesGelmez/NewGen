package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nexus/backend/internal/domain"
)

// ApiEndpointRepo is the PostgreSQL implementation of domain.ApiEndpointRepository.
type ApiEndpointRepo struct{ db *DB }

func NewApiEndpointRepo(db *DB) *ApiEndpointRepo { return &ApiEndpointRepo{db: db} }

func scanEndpoint(row pgx.Row) (*domain.ApiEndpoint, error) {
	var ep domain.ApiEndpoint
	var paramsRaw, responseRaw []byte
	err := row.Scan(
		&ep.ID, &ep.TenantID, &ep.Name, &ep.Slug, &ep.Method, &ep.Path,
		&ep.Description, &ep.Enabled, &ep.Auth, &ep.Category,
		&paramsRaw, &responseRaw, &ep.TestMode, &ep.CallCount,
		&ep.LastCalledAt, &ep.CreatedAt, &ep.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(paramsRaw, &ep.Parameters)
	_ = json.Unmarshal(responseRaw, &ep.Response)
	return &ep, nil
}

const epCols = `id, tenant_id, name, slug, method, path, description, enabled, auth, category,
	parameters, response, test_mode, call_count, last_called_at, created_at, updated_at`

func (r *ApiEndpointRepo) FindAll(ctx context.Context, tenantID string) ([]domain.ApiEndpoint, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT `+epCols+` FROM api_endpoints WHERE tenant_id=$1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("endpoints FindAll: %w", err)
	}
	defer rows.Close()

	var out []domain.ApiEndpoint
	for rows.Next() {
		var ep domain.ApiEndpoint
		var paramsRaw, responseRaw []byte
		if err := rows.Scan(
			&ep.ID, &ep.TenantID, &ep.Name, &ep.Slug, &ep.Method, &ep.Path,
			&ep.Description, &ep.Enabled, &ep.Auth, &ep.Category,
			&paramsRaw, &responseRaw, &ep.TestMode, &ep.CallCount,
			&ep.LastCalledAt, &ep.CreatedAt, &ep.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(paramsRaw, &ep.Parameters)
		_ = json.Unmarshal(responseRaw, &ep.Response)
		out = append(out, ep)
	}
	return out, rows.Err()
}

func (r *ApiEndpointRepo) FindByID(ctx context.Context, id string) (*domain.ApiEndpoint, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT `+epCols+` FROM api_endpoints WHERE id=$1`, id)
	ep, err := scanEndpoint(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("endpoint %q not found", id)
	}
	return ep, err
}

func (r *ApiEndpointRepo) FindBySlug(ctx context.Context, tenantID, slug string) (*domain.ApiEndpoint, error) {
	row := r.db.Pool.QueryRow(ctx,
		`SELECT `+epCols+` FROM api_endpoints WHERE tenant_id=$1 AND slug=$2`, tenantID, slug)
	ep, err := scanEndpoint(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("endpoint %q not found", slug)
	}
	return ep, err
}

func (r *ApiEndpointRepo) Create(ctx context.Context, ep *domain.ApiEndpoint) error {
	now := time.Now().UTC()
	ep.CreatedAt = now
	ep.UpdatedAt = now
	paramsJSON, _ := json.Marshal(ep.Parameters)
	responseJSON, _ := json.Marshal(ep.Response)
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO api_endpoints
		    (id, tenant_id, name, slug, method, path, description, enabled, auth, category,
		     parameters, response, test_mode, call_count, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		ep.ID, ep.TenantID, ep.Name, ep.Slug, ep.Method, ep.Path,
		ep.Description, ep.Enabled, ep.Auth, ep.Category,
		paramsJSON, responseJSON, ep.TestMode, ep.CallCount,
		ep.CreatedAt, ep.UpdatedAt)
	return err
}

func (r *ApiEndpointRepo) Update(ctx context.Context, ep *domain.ApiEndpoint) error {
	ep.UpdatedAt = time.Now().UTC()
	paramsJSON, _ := json.Marshal(ep.Parameters)
	responseJSON, _ := json.Marshal(ep.Response)
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE api_endpoints SET name=$2, slug=$3, method=$4, path=$5, description=$6,
		enabled=$7, auth=$8, category=$9, parameters=$10, response=$11, test_mode=$12,
		updated_at=$13 WHERE id=$1`,
		ep.ID, ep.Name, ep.Slug, ep.Method, ep.Path, ep.Description,
		ep.Enabled, ep.Auth, ep.Category, paramsJSON, responseJSON, ep.TestMode, ep.UpdatedAt)
	return err
}

func (r *ApiEndpointRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM api_endpoints WHERE id=$1`, id)
	return err
}

func (r *ApiEndpointRepo) IncrementCallCount(ctx context.Context, id string) error {
	now := time.Now().UTC()
	_, err := r.db.Pool.Exec(ctx,
		`UPDATE api_endpoints SET call_count=call_count+1, last_called_at=$2 WHERE id=$1`, id, now)
	return err
}
