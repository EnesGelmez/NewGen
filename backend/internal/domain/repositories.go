// Package domain â€“ repository interfaces (ports).
// Concrete implementations live in internal/repository.
package domain

import (
	"context"
	"time"
)

// â”€â”€â”€ TenantRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TenantRepository interface {
	FindAll(ctx context.Context) ([]Tenant, error)
	FindByID(ctx context.Context, id string) (*Tenant, error)
	FindBySubdomain(ctx context.Context, subdomain string) (*Tenant, error)
	FindByAPIKey(ctx context.Context, apiKey string) (*Tenant, error)
	Create(ctx context.Context, t *Tenant) error
	Update(ctx context.Context, t *Tenant) error
	Delete(ctx context.Context, id string) error
}

// â”€â”€â”€ UserRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type UserRepository interface {
	FindAll(ctx context.Context, tenantID string) ([]User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, u *User) error
	Update(ctx context.Context, u *User) error
	Delete(ctx context.Context, id string) error
}

// â”€â”€â”€ WorkflowRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type WorkflowRepository interface {
	FindAll(ctx context.Context, tenantID string) ([]Workflow, error)
	FindByID(ctx context.Context, id string) (*Workflow, error)
	Create(ctx context.Context, w *Workflow) error
	Update(ctx context.Context, w *Workflow) error
	Delete(ctx context.Context, id string) error
	IncrementStats(ctx context.Context, workflowID string, success bool, durationMs int64) error
}

// â”€â”€â”€ WorkflowRunRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type WorkflowRunRepository interface {
	FindByWorkflow(ctx context.Context, workflowID string, limit int) ([]WorkflowRun, error)
	FindAllByTenant(ctx context.Context, tenantID string, limit int) ([]WorkflowRunSummary, error)
	FindByID(ctx context.Context, id string) (*WorkflowRun, error)
	Create(ctx context.Context, r *WorkflowRun) error
	Update(ctx context.Context, r *WorkflowRun) error
	StatsForTenant(ctx context.Context, tenantID string, since time.Time) (*TenantRunStats, error)
}

// â”€â”€â”€ ApiEndpointRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ApiEndpointRepository interface {
	FindAll(ctx context.Context, tenantID string) ([]ApiEndpoint, error)
	FindByID(ctx context.Context, id string) (*ApiEndpoint, error)
	FindBySlug(ctx context.Context, tenantID, slug string) (*ApiEndpoint, error)
	Create(ctx context.Context, ep *ApiEndpoint) error
	Update(ctx context.Context, ep *ApiEndpoint) error
	Delete(ctx context.Context, id string) error
	IncrementCallCount(ctx context.Context, id string) error
}

// â”€â”€â”€ AgentRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type AgentRepository interface {
	FindByTenant(ctx context.Context, tenantID string) (*Agent, error)
	Upsert(ctx context.Context, a *Agent) error
}

// â”€â”€â”€ TenantAgentRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// TenantAgentRepository manages the outbound LOGO ERP agent configuration per tenant.
type TenantAgentRepository interface {
	FindByTenant(ctx context.Context, tenantID string) (*TenantAgent, error)
	Upsert(ctx context.Context, a *TenantAgent) error
	Delete(ctx context.Context, tenantID string) error
}
