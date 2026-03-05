// Package service holds all business logic between handlers and repositories.
package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/newgen/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

// ─── AuthService ──────────────────────────────────────────────────────────────

// LoginRequest carries login credentials.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is returned on successful authentication.
type LoginResponse struct {
	Token     string      `json:"token"`
	ExpiresAt time.Time   `json:"expiresAt"`
	User      domain.User `json:"user"`
}

// AuthService handles authentication and token issuance.
type AuthService struct {
	users    domain.UserRepository
	jwtSvc   *JWTService
}

func NewAuthService(users domain.UserRepository, jwtSvc *JWTService) *AuthService {
	return &AuthService{users: users, jwtSvc: jwtSvc}
}

// Login validates credentials and returns a signed JWT.
func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	user, err := s.users.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}
	if !user.IsActive {
		return nil, fmt.Errorf("account is disabled")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}
	token, exp, err := s.jwtSvc.Issue(user.ID, user.TenantID, string(user.Role))
	if err != nil {
		return nil, fmt.Errorf("could not issue token: %w", err)
	}
	return &LoginResponse{Token: token, ExpiresAt: exp, User: *user}, nil
}

// ─── TenantService ────────────────────────────────────────────────────────────

type TenantService struct {
	repo domain.TenantRepository
}

func NewTenantService(repo domain.TenantRepository) *TenantService {
	return &TenantService{repo: repo}
}

func (s *TenantService) List(ctx context.Context) ([]domain.Tenant, error) {
	return s.repo.FindAll(ctx)
}

func (s *TenantService) Get(ctx context.Context, id string) (*domain.Tenant, error) {
	return s.repo.FindByID(ctx, id)
}

type CreateTenantRequest struct {
	Name      string `json:"name"`
	Subdomain string `json:"subdomain"`
	Email     string `json:"email"`
	Plan      string `json:"plan"`
}

func (s *TenantService) Create(ctx context.Context, req CreateTenantRequest) (*domain.Tenant, error) {
	t := &domain.Tenant{
		Name:       req.Name,
		Subdomain:  req.Subdomain,
		Email:      req.Email,
		Status:     domain.TenantStatusTrial,
		Plan:       req.Plan,
		AgentToken: uuid.New().String(),
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TenantService) Update(ctx context.Context, id string, req CreateTenantRequest) (*domain.Tenant, error) {
	t, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	t.Name = req.Name
	t.Email = req.Email
	t.Plan = req.Plan
	if err := s.repo.Update(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TenantService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
// ─── TenantAgentService ────────────────────────────────────────────────────────────────

type TenantAgentService struct {
	repo domain.TenantAgentRepository
}

func NewTenantAgentService(repo domain.TenantAgentRepository) *TenantAgentService {
	return &TenantAgentService{repo: repo}
}

func (s *TenantAgentService) Get(ctx context.Context, tenantID string) (*domain.TenantAgent, error) {
	return s.repo.FindByTenant(ctx, tenantID)
}

// SaveTenantAgentRequest is the body for creating or updating a tenant agent.
type SaveTenantAgentRequest struct {
	Name        string `json:"name"`
	EndpointURL string `json:"endpointUrl"`
	SecretKey   string `json:"secretKey"`
	IsActive    bool   `json:"isActive"`
}

func (s *TenantAgentService) Save(ctx context.Context, tenantID string, req SaveTenantAgentRequest) (*domain.TenantAgent, error) {
	existing, _ := s.repo.FindByTenant(ctx, tenantID)
	t := time.Now().UTC()
	a := &domain.TenantAgent{
		TenantID:    tenantID,
		Name:        req.Name,
		EndpointURL: req.EndpointURL,
		SecretKey:   req.SecretKey,
		IsActive:    req.IsActive,
		UpdatedAt:   t,
	}
	if req.Name == "" {
		a.Name = "LOGO ERP Agent"
	}
	if existing != nil {
		a.ID = existing.ID
		a.CreatedAt = existing.CreatedAt
	} else {
		a.ID = uuid.New().String()
		a.CreatedAt = t
	}
	if err := s.repo.Upsert(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *TenantAgentService) Delete(ctx context.Context, tenantID string) error {
	return s.repo.Delete(ctx, tenantID)
}

// GenerateSecret produces a new random secret key.
func (s *TenantAgentService) GenerateSecret() string {
	return "agt-" + uuid.New().String()
}
// ─── WorkflowService ──────────────────────────────────────────────────────────

type WorkflowService struct {
	workflows  domain.WorkflowRepository
	runs       domain.WorkflowRunRepository
	agentRepo  domain.TenantAgentRepository
}

func NewWorkflowService(workflows domain.WorkflowRepository, runs domain.WorkflowRunRepository, agentRepo domain.TenantAgentRepository) *WorkflowService {
	return &WorkflowService{workflows: workflows, runs: runs, agentRepo: agentRepo}
}

func (s *WorkflowService) List(ctx context.Context, tenantID string) ([]domain.Workflow, error) {
	return s.workflows.FindAll(ctx, tenantID)
}

func (s *WorkflowService) Get(ctx context.Context, id string) (*domain.Workflow, error) {
	return s.workflows.FindByID(ctx, id)
}

type SaveWorkflowRequest struct {
	Name        string               `json:"name"`
	Description string               `json:"description"`
	Trigger     string               `json:"trigger"`
	Nodes       []domain.WorkflowNode `json:"nodes"`
	Edges       []domain.WorkflowEdge `json:"edges"`
}

func (s *WorkflowService) Create(ctx context.Context, tenantID string, req SaveWorkflowRequest) (*domain.Workflow, error) {
	w := &domain.Workflow{
		ID:          uuid.New().String(),
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
		Status:      domain.WorkflowStatusDisabled,
		Trigger:     req.Trigger,
		Nodes:       req.Nodes,
		Edges:       req.Edges,
	}
	if err := s.workflows.Create(ctx, w); err != nil {
		return nil, err
	}
	return w, nil
}

func (s *WorkflowService) Update(ctx context.Context, id string, req SaveWorkflowRequest) (*domain.Workflow, error) {
	w, err := s.workflows.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	w.Name = req.Name
	w.Description = req.Description
	w.Trigger = req.Trigger
	w.Nodes = req.Nodes
	w.Edges = req.Edges
	if err := s.workflows.Update(ctx, w); err != nil {
		return nil, err
	}
	return w, nil
}

// SetEnabled toggles a workflow's active/disabled state.
func (s *WorkflowService) SetEnabled(ctx context.Context, id string, enabled bool) (*domain.Workflow, error) {
	w, err := s.workflows.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if enabled {
		w.Status = domain.WorkflowStatusActive
	} else {
		w.Status = domain.WorkflowStatusDisabled
	}
	if err := s.workflows.Update(ctx, w); err != nil {
		return nil, err
	}
	return w, nil
}

func (s *WorkflowService) Delete(ctx context.Context, id string) error {
	return s.workflows.Delete(ctx, id)
}

// GetRuns returns the N most recent execution records for a workflow.
func (s *WorkflowService) GetRuns(ctx context.Context, workflowID string, limit int) ([]domain.WorkflowRun, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.runs.FindByWorkflow(ctx, workflowID, limit)
}

// RecordRun simulates a workflow execution (test / trigger endpoint).
func (s *WorkflowService) RecordRun(
	ctx context.Context,
	workflowID, tenantID string,
	payload map[string]interface{},
	success bool,
	durationMs int64,
) (*domain.WorkflowRun, error) {
	status := domain.RunStatusSuccess
	if !success {
		status = domain.RunStatusFailed
	}
	t := time.Now().UTC()
	run := &domain.WorkflowRun{
		ID:         uuid.New().String(),
		WorkflowID: workflowID,
		TenantID:   tenantID,
		Status:     status,
		DurationMs: durationMs,
		Payload:    payload,
		Result:     map[string]interface{}{"ok": success},
		StartedAt:  t,
		FinishedAt: &t,
	}
	if err := s.runs.Create(ctx, run); err != nil {
		return nil, err
	}
	_ = s.workflows.IncrementStats(ctx, workflowID, success, durationMs)
	return run, nil
}

// TriggerResult is what WorkflowService.Trigger returns.
type TriggerResult struct {
	Run        *domain.WorkflowRun    `json:"run"`
	AgentModel map[string]interface{} `json:"agentModel"`
}

// applyFieldMappings reads a transform_mapping node's config and remaps the
// incoming payload keys to the target model field names.
// Config shape: { "mappingRules": [{"source": "cariKodu", "target": "CLIENTCODE", "transform": "NONE"}, ...] }
func applyFieldMappings(node domain.WorkflowNode, payload map[string]interface{}) map[string]interface{} {
	rules, ok := node.Config["mappingRules"]
	if !ok {
		return payload
	}
	// mappingRules arrives as []interface{} from JSON deserialization
	ruleList, ok := rules.([]interface{})
	if !ok || len(ruleList) == 0 {
		return payload
	}
	mapped := make(map[string]interface{}, len(payload))
	// Copy all original fields first (unmapped fields pass through)
	for k, v := range payload {
		mapped[k] = v
	}
	for _, r := range ruleList {
		rMap, ok := r.(map[string]interface{})
		if !ok {
			continue
		}
		source, _ := rMap["source"].(string)
		target, _ := rMap["target"].(string)
		transform, _ := rMap["transform"].(string)
		if source == "" || target == "" {
			continue
		}
		val, exists := payload[source]
		if !exists {
			continue
		}
		// Apply simple string transforms
		if strVal, isStr := val.(string); isStr {
			switch transform {
			case "UPPERCASE":
				val = strings.ToUpper(strVal)
			case "LOWERCASE":
				val = strings.ToLower(strVal)
			case "TRIM":
				val = strings.TrimSpace(strVal)
			}
		}
		mapped[target] = val
		// Remove the original key if it differs from the target
		if source != target {
			delete(mapped, source)
		}
	}
	return mapped
}

// callAgent attempts an HTTP POST to the agent endpoint.
// Sends X-Agent-Secret header if a secret is provided.
// Returns the agent's response body parsed as a map, or an error map on failure.
func callAgent(ctx context.Context, endpoint, secret string, agentModel map[string]interface{}) map[string]interface{} {
	if endpoint == "" {
		return map[string]interface{}{"_agentError": "no endpoint configured"}
	}
	body, err := json.Marshal(agentModel)
	if err != nil {
		return map[string]interface{}{"_agentError": "marshal error: " + err.Error()}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return map[string]interface{}{"_agentError": "bad endpoint URL: " + err.Error(), "_agentEndpoint": endpoint}
	}
	req.Header.Set("Content-Type", "application/json")
	if secret != "" {
		req.Header.Set("X-Agent-Secret", secret)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return map[string]interface{}{"_agentError": err.Error(), "_agentEndpoint": endpoint}
	}
	defer resp.Body.Close() //nolint:errcheck
	if resp.StatusCode >= 400 {
		return map[string]interface{}{"_agentError": fmt.Sprintf("HTTP %d", resp.StatusCode), "_agentEndpoint": endpoint}
	}
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		// Non-JSON response (e.g. plain string) — treat as success
		return map[string]interface{}{"_agentCalled": true, "_agentEndpoint": endpoint, "_agentStatusCode": resp.StatusCode}
	}
	result["_agentEndpoint"] = endpoint
	result["_agentStatusCode"] = resp.StatusCode
	return result
}

// Trigger executes the full trigger logic for a workflow:
//  1. Fetch the workflow and its nodes
//  2. Apply field mappings from any "transform_mapping" node
//  3. Scan nodes: if "custom_cari_check" or "custom_cari_kontrol" present → cariKontrolEdilecekMi = true
//  4. Build the agent model and attempt to call the configured agent endpoint
//  5. Record the run
func (s *WorkflowService) Trigger(
	ctx context.Context,
	workflowID, tenantID string,
	userPayload map[string]interface{},
) (*TriggerResult, error) {
	wf, err := s.workflows.FindByID(ctx, workflowID)
	if err != nil {
		return nil, err
	}
	if wf.Status == domain.WorkflowStatusDisabled {
		return nil, fmt.Errorf("workflow is disabled")
	}

	// Step 1: Apply field mappings from transform_mapping nodes.
	mappedPayload := make(map[string]interface{}, len(userPayload))
	for k, v := range userPayload {
		mappedPayload[k] = v
	}
	for _, node := range wf.Nodes {
		if node.Type == "transform_mapping" {
			mappedPayload = applyFieldMappings(node, mappedPayload)
		}
	}

	// Step 2: Look up the tenant agent configuration (endpoint + secret).
	var agentEndpoint, agentSecret string
	if ta, err := s.agentRepo.FindByTenant(ctx, tenantID); err == nil && ta.IsActive {
		agentEndpoint = ta.EndpointURL
		agentSecret = ta.SecretKey
	}

	// Step 3: Scan nodes — collect feature flags and append trigger path to agent base URL.
	cariKontrolEdilecekMi := false
	for _, node := range wf.Nodes {
		switch node.Type {
		case "custom_cari_check", "custom_cari_kontrol":
			cariKontrolEdilecekMi = true
		case "trigger_http_json":
			// Append the workflow-specific path to the tenant's agent base URL.
			if agentEndpoint != "" {
				if path, ok := node.Config["endpoint"].(string); ok && path != "" {
					base := strings.TrimRight(agentEndpoint, "/")
					p := "/" + strings.TrimLeft(path, "/")
					agentEndpoint = base + p
				}
			}
		case "agent_request":
			// Fallback: if no tenant agent is configured, use the node's endpoint.
			if agentEndpoint == "" {
				if ep, ok := node.Config["agentEndpoint"].(string); ok && ep != "" {
					agentEndpoint = ep
				}
			}
		}
	}

	// Step 4: Build the model that will be sent to the local Agent.
	agentModel := make(map[string]interface{}, len(mappedPayload)+3)
	for k, v := range mappedPayload {
		agentModel[k] = v
	}
	agentModel["cariKontrolEdilecekMi"] = cariKontrolEdilecekMi
	agentModel["workflowId"] = workflowID
	agentModel["triggeredAt"] = time.Now().UTC()

	// Step 5: Attempt actual agent call; result always contains diagnostic fields.
	agentResponse := callAgent(ctx, agentEndpoint, agentSecret, agentModel)
	resultPayload := agentModel
	for k, v := range agentResponse {
		resultPayload[k] = v
	}
	if _, hasErr := agentResponse["_agentError"]; !hasErr {
		resultPayload["_agentCalled"] = true
	}

	// Step 6: Record the run.
	now := time.Now().UTC()
	run := &domain.WorkflowRun{
		ID:         uuid.New().String(),
		WorkflowID: workflowID,
		TenantID:   tenantID,
		Status:     domain.RunStatusSuccess,
		DurationMs: 0,
		Payload:    userPayload,
		Result:     resultPayload,
		StartedAt:  now,
		FinishedAt: &now,
	}
	if err := s.runs.Create(ctx, run); err != nil {
		return nil, err
	}
	_ = s.workflows.IncrementStats(ctx, workflowID, true, 0)

	return &TriggerResult{
		Run:        run,
		AgentModel: agentModel,
	}, nil
}

// ─── ApiEndpointService ───────────────────────────────────────────────────────

type ApiEndpointService struct {
	repo domain.ApiEndpointRepository
}

func NewApiEndpointService(repo domain.ApiEndpointRepository) *ApiEndpointService {
	return &ApiEndpointService{repo: repo}
}

func (s *ApiEndpointService) List(ctx context.Context, tenantID string) ([]domain.ApiEndpoint, error) {
	return s.repo.FindAll(ctx, tenantID)
}

func (s *ApiEndpointService) Get(ctx context.Context, id string) (*domain.ApiEndpoint, error) {
	return s.repo.FindByID(ctx, id)
}

type CreateEndpointRequest struct {
	Name        string                  `json:"name"`
	Slug        string                  `json:"slug"`
	Method      domain.EndpointMethod   `json:"method"`
	Path        string                  `json:"path"`
	Description string                  `json:"description"`
	Auth        domain.EndpointAuthType `json:"auth"`
	Category    string                  `json:"category"`
	Parameters  []domain.EndpointParam  `json:"parameters"`
	Response    domain.EndpointResponse `json:"response"`
	TestMode    bool                    `json:"testMode"`
}

func (s *ApiEndpointService) Create(ctx context.Context, tenantID string, req CreateEndpointRequest) (*domain.ApiEndpoint, error) {
	ep := &domain.ApiEndpoint{
		TenantID:    tenantID,
		Name:        req.Name,
		Slug:        req.Slug,
		Method:      req.Method,
		Path:        req.Path,
		Description: req.Description,
		Enabled:     true,
		Auth:        req.Auth,
		Category:    req.Category,
		Parameters:  req.Parameters,
		Response:    req.Response,
		TestMode:    req.TestMode,
	}
	if err := s.repo.Create(ctx, ep); err != nil {
		return nil, err
	}
	return ep, nil
}

func (s *ApiEndpointService) SetEnabled(ctx context.Context, id string, enabled bool) (*domain.ApiEndpoint, error) {
	ep, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	ep.Enabled = enabled
	if err := s.repo.Update(ctx, ep); err != nil {
		return nil, err
	}
	return ep, nil
}

func (s *ApiEndpointService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// ─── CariKontrolService ───────────────────────────────────────────────────────

// CariKontrolService implements the "Cari Kontrol" business operation.
// Architecture:
//   1. Cloud receives cariKod
//   2. Cloud returns { cariKontrolEdilecekMi: true } to caller
//   3. Cloud builds AgentCariKontrolModel and forwards to the local Agent
//   4. Agent does actual ERP lookup and returns result
type CariKontrolService struct {
	endpoints domain.ApiEndpointRepository
	agents    domain.AgentRepository
}

func NewCariKontrolService(endpoints domain.ApiEndpointRepository, agents domain.AgentRepository) *CariKontrolService {
	return &CariKontrolService{endpoints: endpoints, agents: agents}
}

// Check performs the cloud-side Cari Kontrol: always returns
// cariKontrolEdilecekMi=true (test mode) and records the call.
func (s *CariKontrolService) Check(ctx context.Context, tenantID string, req domain.CariKontrolRequest) (*domain.CariKontrolResponse, error) {
	if req.CariKod == "" {
		return nil, fmt.Errorf("cariKod is required")
	}
	// record the call
	_ = s.endpoints.IncrementCallCount(ctx, "ep-001")

	return &domain.CariKontrolResponse{
		Success:               true,
		CariKontrolEdilecekMi: true,
		CariKod:               req.CariKod,
	}, nil
}

// BuildAgentModel constructs the model that will be forwarded to the local Agent.
func (s *CariKontrolService) BuildAgentModel(cariKod string, extra map[string]interface{}) *domain.AgentCariKontrolModel {
	return &domain.AgentCariKontrolModel{
		CariKod:               cariKod,
		CariKontrolEdilecekMi: true,
		AdditionalData:        extra,
	}
}

// ─── AgentService ────────────────────────────────────────────────────────────

type AgentService struct {
	repo domain.AgentRepository
}

func NewAgentService(repo domain.AgentRepository) *AgentService {
	return &AgentService{repo: repo}
}

func (s *AgentService) GetStatus(ctx context.Context, tenantID string) (*domain.Agent, error) {
	return s.repo.FindByTenant(ctx, tenantID)
}

// Heartbeat is called by the local Agent to signal it is alive.
func (s *AgentService) Heartbeat(ctx context.Context, tenantID, agentID, version, hostname string) error {
	t := time.Now().UTC()
	a := &domain.Agent{
		ID:            agentID,
		TenantID:      tenantID,
		Hostname:      hostname,
		Version:       version,
		Status:        domain.AgentOnline,
		LastHeartbeat: &t,
		RegisteredAt:  t,
	}
	return s.repo.Upsert(ctx, a)
}

// ProcessRequest simulates the Agent processing a model from the cloud.
// In production, this logic runs inside the on-premise Agent binary.
func (s *AgentService) ProcessRequest(ctx context.Context, req domain.AgentProcessRequest) (*domain.AgentProcessResponse, error) {
	// Simulate cari kontrol lookup
	cariMevcut := true
	if kod, ok := req.Model["cariKod"].(string); ok && kod == "" {
		cariMevcut = false
	}
	return &domain.AgentProcessResponse{
		Success:    true,
		CariMevcut: cariMevcut,
		Result: map[string]interface{}{
			"runId":      req.RunID,
			"processed":  true,
			"cariMevcut": cariMevcut,
		},
	}, nil
}
