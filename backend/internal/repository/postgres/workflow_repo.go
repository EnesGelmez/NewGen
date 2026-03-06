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

// WorkflowRepo is the PostgreSQL implementation of domain.WorkflowRepository.
type WorkflowRepo struct{ db *DB }

func NewWorkflowRepo(db *DB) *WorkflowRepo { return &WorkflowRepo{db: db} }

func scanWorkflow(row pgx.Row) (*domain.Workflow, error) {
	var w domain.Workflow
	var nodesRaw, edgesRaw, statsRaw []byte
	err := row.Scan(
		&w.ID, &w.TenantID, &w.Name, &w.Description, &w.Status,
		&w.Trigger, &nodesRaw, &edgesRaw, &statsRaw,
		&w.CreatedAt, &w.UpdatedAt, &w.LastRunAt,
	)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(nodesRaw, &w.Nodes); err != nil {
		w.Nodes = []domain.WorkflowNode{}
	}
	if err := json.Unmarshal(edgesRaw, &w.Edges); err != nil {
		w.Edges = []domain.WorkflowEdge{}
	}
	if err := json.Unmarshal(statsRaw, &w.Stats); err != nil {
		w.Stats = domain.WorkflowStats{Trend: "neutral"}
	}
	return &w, nil
}

func (r *WorkflowRepo) FindAll(ctx context.Context, tenantID string) ([]domain.Workflow, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT w.id, w.tenant_id, w.name, w.description, w.status, w.trigger,
		       w.nodes, w.edges, w.stats, w.created_at, w.updated_at, w.last_run_at,
		       COALESCE(s.total, 0),
		       COALESCE(s.success, 0),
		       COALESCE(s.failed, 0),
		       COALESCE(s.avg_ms, 0),
		       COALESCE(s.day_runs, 0),
		       COALESCE(s.day_success, 0),
		       COALESCE(s.day_failed, 0)
		FROM workflows w
		LEFT JOIN (
			SELECT workflow_id,
			       COUNT(*)                                             AS total,
			       COUNT(*) FILTER (WHERE status = 'SUCCESS')           AS success,
			       COUNT(*) FILTER (WHERE status = 'FAILED')            AS failed,
			       ROUND(AVG(duration_ms)::numeric, 2)                  AS avg_ms,
			       COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours')                          AS day_runs,
			       COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours' AND status = 'SUCCESS')   AS day_success,
			       COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours' AND status = 'FAILED')    AS day_failed
			FROM workflow_runs WHERE tenant_id = $1
			GROUP BY workflow_id
		) s ON w.id = s.workflow_id
		WHERE w.tenant_id = $1
		ORDER BY w.created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("workflows FindAll: %w", err)
	}
	defer rows.Close()

	var out []domain.Workflow
	for rows.Next() {
		var w domain.Workflow
		var nodesRaw, edgesRaw, statsRaw []byte
		var total, success, failed, dayRuns, daySuccess, dayFailed int64
		var avgMs float64
		if err := rows.Scan(&w.ID, &w.TenantID, &w.Name, &w.Description, &w.Status,
			&w.Trigger, &nodesRaw, &edgesRaw, &statsRaw,
			&w.CreatedAt, &w.UpdatedAt, &w.LastRunAt,
			&total, &success, &failed, &avgMs,
			&dayRuns, &daySuccess, &dayFailed); err != nil {
			return nil, err
		}
		json.Unmarshal(nodesRaw, &w.Nodes) //nolint:errcheck
		json.Unmarshal(edgesRaw, &w.Edges) //nolint:errcheck
		json.Unmarshal(statsRaw, &w.Stats) //nolint:errcheck
		if w.Nodes == nil { w.Nodes = []domain.WorkflowNode{} }
		if w.Edges == nil { w.Edges = []domain.WorkflowEdge{} }
		w.Stats.TotalRuns = total
		w.Stats.SuccessRuns = success
		w.Stats.FailedRuns = failed
		w.Stats.AvgDurationMs = avgMs
		w.Stats.LastDayRuns = dayRuns
		w.Stats.LastDaySuccess = daySuccess
		w.Stats.LastDayFailed = dayFailed
		out = append(out, w)
	}
	return out, rows.Err()
}

func (r *WorkflowRepo) FindByID(ctx context.Context, id string) (*domain.Workflow, error) {
	var w domain.Workflow
	var nodesRaw, edgesRaw, statsRaw []byte
	var total, success, failed, dayRuns, daySuccess, dayFailed int64
	var avgMs float64
	err := r.db.Pool.QueryRow(ctx, `
		SELECT w.id, w.tenant_id, w.name, w.description, w.status, w.trigger,
		       w.nodes, w.edges, w.stats, w.created_at, w.updated_at, w.last_run_at,
		       COALESCE(s.total, 0),
		       COALESCE(s.success, 0),
		       COALESCE(s.failed, 0),
		       COALESCE(s.avg_ms, 0),
		       COALESCE(s.day_runs, 0),
		       COALESCE(s.day_success, 0),
		       COALESCE(s.day_failed, 0)
		FROM workflows w
		LEFT JOIN (
			SELECT workflow_id,
			       COUNT(*)                                             AS total,
			       COUNT(*) FILTER (WHERE status = 'SUCCESS')           AS success,
			       COUNT(*) FILTER (WHERE status = 'FAILED')            AS failed,
			       ROUND(AVG(duration_ms)::numeric, 2)                  AS avg_ms,
			       COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours')                          AS day_runs,
			       COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours' AND status = 'SUCCESS')   AS day_success,
			       COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours' AND status = 'FAILED')    AS day_failed
			FROM workflow_runs
			GROUP BY workflow_id
		) s ON w.id = s.workflow_id
		WHERE w.id = $1`, id).
		Scan(&w.ID, &w.TenantID, &w.Name, &w.Description, &w.Status,
			&w.Trigger, &nodesRaw, &edgesRaw, &statsRaw,
			&w.CreatedAt, &w.UpdatedAt, &w.LastRunAt,
			&total, &success, &failed, &avgMs,
			&dayRuns, &daySuccess, &dayFailed)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("workflow %q not found", id)
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(nodesRaw, &w.Nodes) //nolint:errcheck
	json.Unmarshal(edgesRaw, &w.Edges) //nolint:errcheck
	json.Unmarshal(statsRaw, &w.Stats) //nolint:errcheck
	if w.Nodes == nil { w.Nodes = []domain.WorkflowNode{} }
	if w.Edges == nil { w.Edges = []domain.WorkflowEdge{} }
	w.Stats.TotalRuns = total
	w.Stats.SuccessRuns = success
	w.Stats.FailedRuns = failed
	w.Stats.AvgDurationMs = avgMs
	w.Stats.LastDayRuns = dayRuns
	w.Stats.LastDaySuccess = daySuccess
	w.Stats.LastDayFailed = dayFailed
	return &w, nil
}

func (r *WorkflowRepo) Create(ctx context.Context, w *domain.Workflow) error {
	now := time.Now().UTC()
	w.CreatedAt = now
	w.UpdatedAt = now
	nodesJSON, _ := json.Marshal(w.Nodes)
	edgesJSON, _ := json.Marshal(w.Edges)
	statsJSON, _ := json.Marshal(w.Stats)
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO workflows (id, tenant_id, name, description, status, trigger,
		                       nodes, edges, stats, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		w.ID, w.TenantID, w.Name, w.Description, w.Status, w.Trigger,
		nodesJSON, edgesJSON, statsJSON, w.CreatedAt, w.UpdatedAt)
	return err
}

func (r *WorkflowRepo) Update(ctx context.Context, w *domain.Workflow) error {
	w.UpdatedAt = time.Now().UTC()
	nodesJSON, _ := json.Marshal(w.Nodes)
	edgesJSON, _ := json.Marshal(w.Edges)
	statsJSON, _ := json.Marshal(w.Stats)
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE workflows SET name=$2, description=$3, status=$4, trigger=$5,
		nodes=$6, edges=$7, stats=$8, updated_at=$9, last_run_at=$10
		WHERE id=$1`,
		w.ID, w.Name, w.Description, w.Status, w.Trigger,
		nodesJSON, edgesJSON, statsJSON, w.UpdatedAt, w.LastRunAt)
	return err
}

func (r *WorkflowRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM workflows WHERE id=$1`, id)
	return err
}

// IncrementStats atomically updates the workflow statistics JSONB column.
func (r *WorkflowRepo) IncrementStats(ctx context.Context, workflowID string, success bool, durationMs int64) error {
	now := time.Now().UTC()
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE workflows
		SET
			last_run_at = $2,
			updated_at  = $2,
			stats = jsonb_set(
				jsonb_set(
					jsonb_set(
						stats,
						'{totalRuns}',
						to_jsonb((COALESCE((stats->>'totalRuns')::bigint, 0) + 1))
					),
					CASE WHEN $3 THEN '{successRuns}' ELSE '{failedRuns}' END,
					to_jsonb((COALESCE((stats->>CASE WHEN $3 THEN 'successRuns' ELSE 'failedRuns' END)::bigint, 0) + 1))
				),
				'{avgDurationMs}',
				to_jsonb(
					ROUND(
						(COALESCE((stats->>'avgDurationMs')::numeric, 0) *
						 COALESCE((stats->>'totalRuns')::numeric, 0) + $4::numeric) /
						(COALESCE((stats->>'totalRuns')::numeric, 0) + 1),
					2)
				)
			)
		WHERE id = $1`,
		workflowID, now, success, durationMs)
	return err
}
