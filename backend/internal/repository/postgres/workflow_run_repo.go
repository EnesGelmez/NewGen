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

// WorkflowRunRepo is the PostgreSQL implementation of domain.WorkflowRunRepository.
type WorkflowRunRepo struct{ db *DB }

func NewWorkflowRunRepo(db *DB) *WorkflowRunRepo { return &WorkflowRunRepo{db: db} }

func scanRun(row pgx.Row) (*domain.WorkflowRun, error) {
	var r domain.WorkflowRun
	var payloadRaw, resultRaw []byte
	err := row.Scan(
		&r.ID, &r.WorkflowID, &r.TenantID, &r.Status,
		&r.DurationMs, &payloadRaw, &resultRaw, &r.ErrorMsg,
		&r.StartedAt, &r.FinishedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(payloadRaw, &r.Payload)
	_ = json.Unmarshal(resultRaw, &r.Result)
	return &r, nil
}

func (r *WorkflowRunRepo) FindByWorkflow(ctx context.Context, workflowID string, limit int) ([]domain.WorkflowRun, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workflow_id, tenant_id, status, duration_ms,
		       payload, result, error_msg, started_at, finished_at
		FROM workflow_runs WHERE workflow_id=$1
		ORDER BY started_at DESC LIMIT $2`, workflowID, limit)
	if err != nil {
		return nil, fmt.Errorf("runs FindByWorkflow: %w", err)
	}
	defer rows.Close()

	var out []domain.WorkflowRun
	for rows.Next() {
		var run domain.WorkflowRun
		var payloadRaw, resultRaw []byte
		if err := rows.Scan(&run.ID, &run.WorkflowID, &run.TenantID, &run.Status,
			&run.DurationMs, &payloadRaw, &resultRaw, &run.ErrorMsg,
			&run.StartedAt, &run.FinishedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(payloadRaw, &run.Payload)
		_ = json.Unmarshal(resultRaw, &run.Result)
		out = append(out, run)
	}
	return out, rows.Err()
}

func (r *WorkflowRunRepo) FindByID(ctx context.Context, id string) (*domain.WorkflowRun, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, workflow_id, tenant_id, status, duration_ms,
		       payload, result, error_msg, started_at, finished_at
		FROM workflow_runs WHERE id=$1`, id)
	run, err := scanRun(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("run %q not found", id)
	}
	return run, err
}

func (r *WorkflowRunRepo) Create(ctx context.Context, run *domain.WorkflowRun) error {
	run.StartedAt = time.Now().UTC()
	payloadJSON, _ := json.Marshal(run.Payload)
	resultJSON, _ := json.Marshal(run.Result)
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO workflow_runs
		    (id, workflow_id, tenant_id, status, duration_ms, payload, result, error_msg, started_at, finished_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		run.ID, run.WorkflowID, run.TenantID, run.Status, run.DurationMs,
		payloadJSON, resultJSON, run.ErrorMsg, run.StartedAt, run.FinishedAt)
	return err
}

func (r *WorkflowRunRepo) Update(ctx context.Context, run *domain.WorkflowRun) error {
	resultJSON, _ := json.Marshal(run.Result)
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE workflow_runs SET status=$2, duration_ms=$3, result=$4, error_msg=$5, finished_at=$6
		WHERE id=$1`,
		run.ID, run.Status, run.DurationMs, resultJSON, run.ErrorMsg, run.FinishedAt)
	return err
}

// FindAllByTenant returns the most recent runs across all workflows for a tenant.
func (r *WorkflowRunRepo) FindAllByTenant(ctx context.Context, tenantID string, limit int) ([]domain.WorkflowRunSummary, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT r.id, r.workflow_id, COALESCE(w.name, ''), r.status, r.error_msg, r.started_at, r.duration_ms
		FROM workflow_runs r
		LEFT JOIN workflows w ON r.workflow_id = w.id
		WHERE r.tenant_id = $1
		ORDER BY r.started_at DESC LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("FindAllByTenant: %w", err)
	}
	defer rows.Close()
	out := make([]domain.WorkflowRunSummary, 0)
	for rows.Next() {
		var s domain.WorkflowRunSummary
		if err := rows.Scan(&s.RunID, &s.WorkflowID, &s.WorkflowName, &s.Status, &s.ErrorMsg, &s.StartedAt, &s.DurationMs); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// StatsForTenant returns aggregated run statistics for a tenant since the given time.
func (r *WorkflowRunRepo) StatsForTenant(ctx context.Context, tenantID string, since time.Time) (*domain.TenantRunStats, error) {
	// Aggregate run counts for the given time window
	var total, successful, failed int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE started_at >= $2),
			COUNT(*) FILTER (WHERE started_at >= $2 AND status = 'SUCCESS'),
			COUNT(*) FILTER (WHERE started_at >= $2 AND status = 'FAILED')
		FROM workflow_runs WHERE tenant_id = $1`, tenantID, since).
		Scan(&total, &successful, &failed)
	if err != nil {
		return nil, fmt.Errorf("StatsForTenant counts: %w", err)
	}

	// Count active workflows for this tenant
	var activeWorkflows int
	_ = r.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflows WHERE tenant_id = $1 AND status = 'ACTIVE'`, tenantID).
		Scan(&activeWorkflows)

	// Recent runs with workflow name (last 10)
	rows, err := r.db.Pool.Query(ctx, `
		SELECT r.id, r.workflow_id, COALESCE(w.name, ''), r.status, r.started_at, r.duration_ms
		FROM workflow_runs r
		LEFT JOIN workflows w ON r.workflow_id = w.id
		WHERE r.tenant_id = $1
		ORDER BY r.started_at DESC LIMIT 10`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("StatsForTenant recent: %w", err)
	}
	defer rows.Close()

	recentRuns := make([]domain.WorkflowRunSummary, 0)
	for rows.Next() {
		var s domain.WorkflowRunSummary
		if err := rows.Scan(&s.RunID, &s.WorkflowID, &s.WorkflowName, &s.Status, &s.StartedAt, &s.DurationMs); err != nil {
			continue
		}
		recentRuns = append(recentRuns, s)
	}

	return &domain.TenantRunStats{
		Total:           total,
		Successful:      successful,
		Failed:          failed,
		ActiveWorkflows: activeWorkflows,
		RecentRuns:      recentRuns,
	}, nil
}
