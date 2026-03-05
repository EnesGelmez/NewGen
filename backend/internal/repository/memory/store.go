// Package memory provides in-memory implementations of all domain repositories.
// These are suitable for development and testing; swap with a database
// implementation (e.g. postgres) for production use.
package memory

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/newgen/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func newID() string { return uuid.New().String() }
func now() time.Time { return time.Now().UTC() }

// ─── TenantRepo ──────────────────────────────────────────────────────────────

type TenantRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.Tenant
}

func NewTenantRepo() *TenantRepo {
	r := &TenantRepo{data: make(map[string]*domain.Tenant)}
	r.seed()
	return r
}

func (r *TenantRepo) seed() {
	id := "tenant-001"
	t := now()
	r.data[id] = &domain.Tenant{
		ID:        id,
		Name:      "Arçelik Pazarlama A.Ş.",
		Subdomain: "arcelik",
		Email:     "entegrasyon@arcelik.com",
		Status:    domain.TenantStatusActive,
		Plan:      "Enterprise",
		AgentToken: "agent-secret-arcelik-001",
		CreatedAt: t,
		UpdatedAt: t,
	}
	id2 := "tenant-002"
	r.data[id2] = &domain.Tenant{
		ID:        id2,
		Name:      "Beko Elektronik A.Ş.",
		Subdomain: "beko",
		Email:     "it@beko.com",
		Status:    domain.TenantStatusTrial,
		Plan:      "Starter",
		AgentToken: "agent-secret-beko-002",
		CreatedAt: t,
		UpdatedAt: t,
	}
}

func (r *TenantRepo) FindAll(_ context.Context) ([]domain.Tenant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.Tenant, 0, len(r.data))
	for _, v := range r.data {
		out = append(out, *v)
	}
	return out, nil
}

func (r *TenantRepo) FindByID(_ context.Context, id string) (*domain.Tenant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.data[id]
	if !ok {
		return nil, fmt.Errorf("tenant %q not found", id)
	}
	cp := *t
	return &cp, nil
}

func (r *TenantRepo) FindBySubdomain(_ context.Context, sub string) (*domain.Tenant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, t := range r.data {
		if t.Subdomain == sub {
			cp := *t
			return &cp, nil
		}
	}
	return nil, fmt.Errorf("tenant with subdomain %q not found", sub)
}

func (r *TenantRepo) Create(_ context.Context, t *domain.Tenant) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if t.ID == "" {
		t.ID = newID()
	}
	t.CreatedAt = now()
	t.UpdatedAt = t.CreatedAt
	cp := *t
	r.data[t.ID] = &cp
	return nil
}

func (r *TenantRepo) Update(_ context.Context, t *domain.Tenant) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[t.ID]; !ok {
		return fmt.Errorf("tenant %q not found", t.ID)
	}
	t.UpdatedAt = now()
	cp := *t
	r.data[t.ID] = &cp
	return nil
}

func (r *TenantRepo) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[id]; !ok {
		return fmt.Errorf("tenant %q not found", id)
	}
	delete(r.data, id)
	return nil
}

// ─── UserRepo ─────────────────────────────────────────────────────────────────

type UserRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.User
}

func NewUserRepo() *UserRepo {
	r := &UserRepo{data: make(map[string]*domain.User)}
	r.seed()
	return r
}

func (r *UserRepo) seed() {
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	t := now()
	r.data["user-001"] = &domain.User{
		ID:           "user-001",
		Name:         "Platform Yöneticisi",
		Email:        "admin@newgen.io",
		PasswordHash: string(hash),
		Role:         domain.UserRoleSuperAdmin,
		IsActive:     true,
		CreatedAt:    t,
		UpdatedAt:    t,
	}

	hash2, _ := bcrypt.GenerateFromPassword([]byte("tenant123"), bcrypt.DefaultCost)
	r.data["user-002"] = &domain.User{
		ID:           "user-002",
		TenantID:     "tenant-001",
		Name:         "Arçelik Entegrasyon",
		Email:        "user@arcelik.com",
		PasswordHash: string(hash2),
		Role:         domain.UserRoleTenantAdmin,
		IsActive:     true,
		CreatedAt:    t,
		UpdatedAt:    t,
	}
}

func (r *UserRepo) FindAll(_ context.Context, tenantID string) ([]domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.User, 0)
	for _, u := range r.data {
		if tenantID == "" || u.TenantID == tenantID {
			cp := *u
			out = append(out, cp)
		}
	}
	return out, nil
}

func (r *UserRepo) FindByID(_ context.Context, id string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.data[id]
	if !ok {
		return nil, fmt.Errorf("user %q not found", id)
	}
	cp := *u
	return &cp, nil
}

func (r *UserRepo) FindByEmail(_ context.Context, email string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.data {
		if u.Email == email {
			cp := *u
			return &cp, nil
		}
	}
	return nil, fmt.Errorf("user with email %q not found", email)
}

func (r *UserRepo) Create(_ context.Context, u *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if u.ID == "" {
		u.ID = newID()
	}
	u.CreatedAt = now()
	u.UpdatedAt = u.CreatedAt
	cp := *u
	r.data[u.ID] = &cp
	return nil
}

func (r *UserRepo) Update(_ context.Context, u *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[u.ID]; !ok {
		return fmt.Errorf("user %q not found", u.ID)
	}
	u.UpdatedAt = now()
	cp := *u
	r.data[u.ID] = &cp
	return nil
}

func (r *UserRepo) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[id]; !ok {
		return fmt.Errorf("user %q not found", id)
	}
	delete(r.data, id)
	return nil
}

// ─── WorkflowRepo ─────────────────────────────────────────────────────────────

type WorkflowRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.Workflow
}

func NewWorkflowRepo() *WorkflowRepo {
	r := &WorkflowRepo{data: make(map[string]*domain.Workflow)}
	r.seed()
	return r
}

func (r *WorkflowRepo) seed() {
	t := now()
	lastRun := t.Add(-10 * time.Minute)
	workflows := []domain.Workflow{
		{
			ID:          "wf-001",
			TenantID:    "tenant-001",
			Name:        "Cari Oluşturma (Tam Akış)",
			Description: "HTTP JSON → Alan Eşleştirme → Doğrulama → e-Mükellef → Merge → Agent İsteği",
			Status:      domain.WorkflowStatusActive,
			Trigger:     "HTTP / JSON Tetikleyici",
			Nodes:       []domain.WorkflowNode{},
			Edges:       []domain.WorkflowEdge{},
			Stats: domain.WorkflowStats{
				TotalRuns: 1284, SuccessRuns: 1251, FailedRuns: 33,
				AvgDurationMs: 420, LastDayRuns: 87, LastDaySuccess: 85, LastDayFailed: 2, Trend: "up",
			},
			CreatedAt: t.AddDate(0, -1, 0),
			UpdatedAt: t,
			LastRunAt: &lastRun,
		},
		{
			ID:          "wf-002",
			TenantID:    "tenant-001",
			Name:        "E-Ticaret → Fatura",
			Description: "Trendyol sipariş gelince fatura modeli oluştur, Agent'a ilet",
			Status:      domain.WorkflowStatusActive,
			Trigger:     "E-Ticaret Siparişi",
			Nodes:       []domain.WorkflowNode{},
			Edges:       []domain.WorkflowEdge{},
			Stats: domain.WorkflowStats{
				TotalRuns: 5620, SuccessRuns: 5540, FailedRuns: 80,
				AvgDurationMs: 310, LastDayRuns: 312, LastDaySuccess: 308, LastDayFailed: 4, Trend: "up",
			},
			CreatedAt: t.AddDate(0, -1, 0),
			UpdatedAt: t,
			LastRunAt: &lastRun,
		},
		{
			ID:          "wf-003",
			TenantID:    "tenant-001",
			Name:        "Müşteri Email Kontrol",
			Description: "Email adresi sisteme kayıtlı mı kontrol et, yeni ise cari oluştur",
			Status:      domain.WorkflowStatusDisabled,
			Trigger:     "HTTP / JSON Tetikleyici",
			Nodes:       []domain.WorkflowNode{},
			Edges:       []domain.WorkflowEdge{},
			Stats: domain.WorkflowStats{
				TotalRuns: 94, SuccessRuns: 91, FailedRuns: 3,
				AvgDurationMs: 195, LastDayRuns: 0, LastDaySuccess: 0, LastDayFailed: 0, Trend: "neutral",
			},
			CreatedAt: t.AddDate(0, 0, -4),
			UpdatedAt: t,
			LastRunAt: nil,
		},
	}
	for i := range workflows {
		cp := workflows[i]
		r.data[cp.ID] = &cp
	}
}

func (r *WorkflowRepo) FindAll(_ context.Context, tenantID string) ([]domain.Workflow, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.Workflow, 0)
	for _, w := range r.data {
		if tenantID == "" || w.TenantID == tenantID {
			cp := *w
			out = append(out, cp)
		}
	}
	return out, nil
}

func (r *WorkflowRepo) FindByID(_ context.Context, id string) (*domain.Workflow, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	w, ok := r.data[id]
	if !ok {
		return nil, fmt.Errorf("workflow %q not found", id)
	}
	cp := *w
	return &cp, nil
}

func (r *WorkflowRepo) Create(_ context.Context, w *domain.Workflow) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if w.ID == "" {
		w.ID = "wf-" + newID()
	}
	w.CreatedAt = now()
	w.UpdatedAt = w.CreatedAt
	if w.Nodes == nil {
		w.Nodes = []domain.WorkflowNode{}
	}
	if w.Edges == nil {
		w.Edges = []domain.WorkflowEdge{}
	}
	cp := *w
	r.data[w.ID] = &cp
	return nil
}

func (r *WorkflowRepo) Update(_ context.Context, w *domain.Workflow) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.data[w.ID]
	if !ok {
		return fmt.Errorf("workflow %q not found", w.ID)
	}
	w.CreatedAt = existing.CreatedAt
	w.UpdatedAt = now()
	cp := *w
	r.data[w.ID] = &cp
	return nil
}

func (r *WorkflowRepo) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[id]; !ok {
		return fmt.Errorf("workflow %q not found", id)
	}
	delete(r.data, id)
	return nil
}

func (r *WorkflowRepo) IncrementStats(_ context.Context, workflowID string, success bool, durationMs int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	w, ok := r.data[workflowID]
	if !ok {
		return fmt.Errorf("workflow %q not found", workflowID)
	}
	w.Stats.TotalRuns++
	if success {
		w.Stats.SuccessRuns++
		w.Stats.LastDaySuccess++
	} else {
		w.Stats.FailedRuns++
		w.Stats.LastDayFailed++
	}
	w.Stats.LastDayRuns++
	// rolling average
	prev := w.Stats.AvgDurationMs * float64(w.Stats.TotalRuns-1)
	w.Stats.AvgDurationMs = (prev + float64(durationMs)) / float64(w.Stats.TotalRuns)
	t := now()
	w.LastRunAt = &t
	w.UpdatedAt = t
	return nil
}

// ─── WorkflowRunRepo ──────────────────────────────────────────────────────────

type WorkflowRunRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.WorkflowRun // keyed by run ID
	// ordered list per workflow
	byWorkflow map[string][]string
}

func NewWorkflowRunRepo() *WorkflowRunRepo {
	return &WorkflowRunRepo{
		data:       make(map[string]*domain.WorkflowRun),
		byWorkflow: make(map[string][]string),
	}
}

func (r *WorkflowRunRepo) FindByWorkflow(_ context.Context, workflowID string, limit int) ([]domain.WorkflowRun, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	ids := r.byWorkflow[workflowID]
	out := make([]domain.WorkflowRun, 0, limit)
	// iterate newest first (ids are appended in order)
	for i := len(ids) - 1; i >= 0 && len(out) < limit; i-- {
		if run, ok := r.data[ids[i]]; ok {
			out = append(out, *run)
		}
	}
	return out, nil
}

func (r *WorkflowRunRepo) FindByID(_ context.Context, id string) (*domain.WorkflowRun, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	run, ok := r.data[id]
	if !ok {
		return nil, fmt.Errorf("run %q not found", id)
	}
	cp := *run
	return &cp, nil
}

func (r *WorkflowRunRepo) Create(_ context.Context, run *domain.WorkflowRun) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if run.ID == "" {
		run.ID = newID()
	}
	run.StartedAt = now()
	cp := *run
	r.data[run.ID] = &cp
	r.byWorkflow[run.WorkflowID] = append(r.byWorkflow[run.WorkflowID], run.ID)
	return nil
}

func (r *WorkflowRunRepo) Update(_ context.Context, run *domain.WorkflowRun) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[run.ID]; !ok {
		return fmt.Errorf("run %q not found", run.ID)
	}
	cp := *run
	r.data[run.ID] = &cp
	return nil
}

// ─── ApiEndpointRepo ──────────────────────────────────────────────────────────

type ApiEndpointRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.ApiEndpoint
}

func NewApiEndpointRepo() *ApiEndpointRepo {
	r := &ApiEndpointRepo{data: make(map[string]*domain.ApiEndpoint)}
	r.seed()
	return r
}

func (r *ApiEndpointRepo) seed() {
	t := now()
	lastCall := t.Add(-5 * time.Minute)
	eps := []domain.ApiEndpoint{
		{
			ID:       "ep-001",
			TenantID: "tenant-001",
			Name:     "Cari Kontrol",
			Slug:     "cari-kontrol",
			Method:   domain.MethodPOST,
			Path:     "/api/v1/cari-kontrol",
			Description: "Gelen cari kodunu/referansını alır ve Agent isteğine " +
				"cariKontrolEdilecekMi bayrağını ekler. Test modunda her zaman true döner.",
			Enabled:  true,
			Auth:     domain.AuthAPIKey,
			Category: "Cari",
			Parameters: []domain.EndpointParam{
				{Name: "cariKod", Type: "string", Required: true, Description: "Sorgulanacak cari kodu"},
			},
			Response: domain.EndpointResponse{
				Type:    "object",
				Example: `{"success":true,"cariKontrolEdilecekMi":true,"cariKod":"ARCE-001"}`,
			},
			TestMode:     true,
			CallCount:    0,
			LastCalledAt: nil,
			CreatedAt:    t,
			UpdatedAt:    t,
		},
		{
			ID:          "ep-002",
			TenantID:    "tenant-001",
			Name:        "Workflow Tetikle (JSON)",
			Slug:        "workflow-trigger-json",
			Method:      domain.MethodPOST,
			Path:        "/api/v1/trigger/{workflowId}",
			Description: "Belirtilen workflow'u bir JSON payload ile tetikler.",
			Enabled:     true,
			Auth:        domain.AuthBearer,
			Category:    "Workflow",
			Parameters: []domain.EndpointParam{
				{Name: "workflowId", Type: "string", Required: true, Description: "URL parametresi"},
				{Name: "payload", Type: "object", Required: true, Description: "Workflow'a iletilen JSON"},
			},
			Response: domain.EndpointResponse{
				Type:    "object",
				Example: `{"runId":"run-abc123","status":"ACCEPTED","workflowId":"wf-001"}`,
			},
			TestMode:     false,
			CallCount:    87,
			LastCalledAt: &lastCall,
			CreatedAt:    t,
			UpdatedAt:    t,
		},
		{
			ID:          "ep-003",
			TenantID:    "tenant-001",
			Name:        "Agent Durum Sorgula",
			Slug:        "agent-status",
			Method:      domain.MethodGET,
			Path:        "/api/v1/agent/status",
			Description: "Bağlı yerel Agent'ın online/offline durumunu döner.",
			Enabled:     true,
			Auth:        domain.AuthBearer,
			Category:    "Agent",
			Parameters:  []domain.EndpointParam{},
			Response: domain.EndpointResponse{
				Type:    "object",
				Example: `{"agentId":"agent-t1","online":true,"version":"1.4.2"}`,
			},
			TestMode:     false,
			CallCount:    1452,
			LastCalledAt: &lastCall,
			CreatedAt:    t,
			UpdatedAt:    t,
		},
	}
	for i := range eps {
		cp := eps[i]
		r.data[cp.ID] = &cp
	}
}

func (r *ApiEndpointRepo) FindAll(_ context.Context, tenantID string) ([]domain.ApiEndpoint, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.ApiEndpoint, 0)
	for _, ep := range r.data {
		if tenantID == "" || ep.TenantID == tenantID {
			out = append(out, *ep)
		}
	}
	return out, nil
}

func (r *ApiEndpointRepo) FindByID(_ context.Context, id string) (*domain.ApiEndpoint, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	ep, ok := r.data[id]
	if !ok {
		return nil, fmt.Errorf("endpoint %q not found", id)
	}
	cp := *ep
	return &cp, nil
}

func (r *ApiEndpointRepo) FindBySlug(_ context.Context, tenantID, slug string) (*domain.ApiEndpoint, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, ep := range r.data {
		if ep.TenantID == tenantID && ep.Slug == slug {
			cp := *ep
			return &cp, nil
		}
	}
	return nil, fmt.Errorf("endpoint with slug %q not found", slug)
}

func (r *ApiEndpointRepo) Create(_ context.Context, ep *domain.ApiEndpoint) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if ep.ID == "" {
		ep.ID = newID()
	}
	ep.CreatedAt = now()
	ep.UpdatedAt = ep.CreatedAt
	cp := *ep
	r.data[ep.ID] = &cp
	return nil
}

func (r *ApiEndpointRepo) Update(_ context.Context, ep *domain.ApiEndpoint) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[ep.ID]; !ok {
		return fmt.Errorf("endpoint %q not found", ep.ID)
	}
	ep.UpdatedAt = now()
	cp := *ep
	r.data[ep.ID] = &cp
	return nil
}

func (r *ApiEndpointRepo) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[id]; !ok {
		return fmt.Errorf("endpoint %q not found", id)
	}
	delete(r.data, id)
	return nil
}

func (r *ApiEndpointRepo) IncrementCallCount(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	ep, ok := r.data[id]
	if !ok {
		return fmt.Errorf("endpoint %q not found", id)
	}
	ep.CallCount++
	t := now()
	ep.LastCalledAt = &t
	return nil
}

// ─── AgentRepo ────────────────────────────────────────────────────────────────

type AgentRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.Agent // keyed by tenantID
}

func NewAgentRepo() *AgentRepo {
	r := &AgentRepo{data: make(map[string]*domain.Agent)}
	r.seed()
	return r
}

func (r *AgentRepo) seed() {
	t := now()
	hb := t.Add(-5 * time.Second)
	r.data["tenant-001"] = &domain.Agent{
		ID:            "agent-t1",
		TenantID:      "tenant-001",
		Hostname:      "ARCELIK-ERP-01",
		Version:       "1.4.2",
		Status:        domain.AgentOnline,
		LastHeartbeat: &hb,
		RegisteredAt:  t.AddDate(0, -1, 0),
	}
}

func (r *AgentRepo) FindByTenant(_ context.Context, tenantID string) (*domain.Agent, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	a, ok := r.data[tenantID]
	if !ok {
		return nil, fmt.Errorf("no agent found for tenant %q", tenantID)
	}
	cp := *a
	return &cp, nil
}

func (r *AgentRepo) Upsert(_ context.Context, a *domain.Agent) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if a.ID == "" {
		a.ID = newID()
	}
	cp := *a
	r.data[a.TenantID] = &cp
	return nil
}

// ─── TenantAgentRepo ─────────────────────────────────────────────────────────

type TenantAgentRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.TenantAgent // keyed by tenantID
}

func NewTenantAgentRepo() *TenantAgentRepo {
	return &TenantAgentRepo{data: make(map[string]*domain.TenantAgent)}
}

func (r *TenantAgentRepo) FindByTenant(_ context.Context, tenantID string) (*domain.TenantAgent, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	a, ok := r.data[tenantID]
	if !ok {
		return nil, fmt.Errorf("agent not configured for tenant %q", tenantID)
	}
	cp := *a
	return &cp, nil
}

func (r *TenantAgentRepo) Upsert(_ context.Context, a *domain.TenantAgent) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if a.ID == "" {
		a.ID = newID()
	}
	t := now()
	if a.CreatedAt.IsZero() {
		a.CreatedAt = t
	}
	a.UpdatedAt = t
	cp := *a
	r.data[a.TenantID] = &cp
	return nil
}

func (r *TenantAgentRepo) Delete(_ context.Context, tenantID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.data, tenantID)
	return nil
}

