// Package service holds all business logic between handlers and repositories.
package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nexus/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

// â”€â”€â”€ AuthService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// ChangePasswordRequest carries the old and new passwords for a self-service change.
type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

// ChangePassword validates the old password and sets the new one.
func (s *AuthService) ChangePassword(ctx context.Context, userID string, req ChangePasswordRequest) error {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("kullanıcı bulunamadı")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return fmt.Errorf("mevcut şifre hatalı")
	}
	if len(req.NewPassword) < 6 {
		return fmt.Errorf("yeni şifre en az 6 karakter olmalıdır")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	user.MustChangePassword = false
	return s.users.Update(ctx, user)
}

// â”€â”€â”€ TenantService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
		APIKey:     "ngk-" + uuid.New().String(),
		AgentToken: uuid.New().String(),
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// LookupByAPIKey resolves an incoming webhook API key to a tenantID.
func (s *TenantService) LookupByAPIKey(ctx context.Context, apiKey string) (string, error) {
	t, err := s.repo.FindByAPIKey(ctx, apiKey)
	if err != nil {
		return "", err
	}
	return t.ID, nil
}

// GetForOwner returns tenant data including the APIKey for self-service settings views.
func (s *TenantService) GetForOwner(ctx context.Context, tenantID string) (*domain.Tenant, error) {
	return s.repo.FindByID(ctx, tenantID)
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
// â”€â”€â”€ TenantAgentService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// --- UserService -------------------------------------------------------------

type UserService struct {
	repo  domain.UserRepository
	roles domain.RoleRepository
}

func NewUserService(repo domain.UserRepository, roles domain.RoleRepository) *UserService {
	return &UserService{repo: repo, roles: roles}
}

// CreateUserRequest is the body for creating a new user.
type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	RoleID   string `json:"roleId"`   // preferred: UUID FK to roles.id
	Role     string `json:"role"`     // legacy: role name (e.g. "VIEWER"); used if RoleID is empty
	Password string `json:"password"`
	TenantID string `json:"tenantId"` // SUPER_ADMIN only: create user in a specific tenant
}

// UpdateUserRequest is the body for editing an existing user.
type UpdateUserRequest struct {
	Name   string `json:"name"`
	RoleID string `json:"roleId"` // preferred
	Role   string `json:"role"`   // legacy
}

func (s *UserService) List(ctx context.Context, tenantID string) ([]domain.User, error) {
	users, err := s.repo.FindAll(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if users == nil {
		users = []domain.User{}
	}
	return users, nil
}

func (s *UserService) resolveRoleID(ctx context.Context, tenantID, roleID, roleName string) (string, error) {
	// If a UUID roleId was supplied, validate it exists and is accessible.
	if roleID != "" {
		r, err := s.roles.FindByID(ctx, roleID)
		if err != nil {
			return "", fmt.Errorf("rol bulunamadı: %w", err)
		}
		// Block elevation to SUPER_ADMIN from tenant context
		if r.Name == string(domain.UserRoleSuperAdmin) && tenantID != "" {
			return "", fmt.Errorf("bu rol atanamaz")
		}
		// Block assigning another tenant's custom role
		if r.TenantID != "" && r.TenantID != tenantID {
			return "", fmt.Errorf("bu rol bu hesaba ait değil")
		}
		return roleID, nil
	}
	// Fallback: resolve from role name string (backward compat)
	if roleName == "" {
		roleName = string(domain.UserRoleViewer)
	}
	if domain.UserRole(roleName) == domain.UserRoleSuperAdmin && tenantID != "" {
		roleName = string(domain.UserRoleViewer)
	}
	allRoles, err := s.roles.FindAll(ctx, tenantID)
	if err != nil {
		return "", fmt.Errorf("rol listesi alınamadı: %w", err)
	}
	for _, r := range allRoles {
		if r.Name == roleName {
			return r.ID, nil
		}
	}
	return "", fmt.Errorf("rol bulunamadı: %s", roleName)
}

func (s *UserService) Create(ctx context.Context, tenantID string, req CreateUserRequest) (*domain.User, error) {
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return nil, fmt.Errorf("ad, e-posta ve şifre zorunludur")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	roleID, err := s.resolveRoleID(ctx, tenantID, req.RoleID, req.Role)
	if err != nil {
		return nil, err
	}
	u := &domain.User{
		ID:                 uuid.New().String(),
		TenantID:           tenantID,
		Name:               req.Name,
		Email:              req.Email,
		PasswordHash:       string(hash),
		RoleID:             roleID,
		IsActive:           true,
		MustChangePassword: true,
	}
	if err := s.repo.Create(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *UserService) Update(ctx context.Context, tenantID, id string, req UpdateUserRequest) (*domain.User, error) {
	u, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u.TenantID != tenantID {
		return nil, fmt.Errorf("forbidden")
	}
	if req.Name != "" {
		u.Name = req.Name
	}
	if req.RoleID != "" || req.Role != "" {
		roleID, err := s.resolveRoleID(ctx, tenantID, req.RoleID, req.Role)
		if err != nil {
			return nil, err
		}
		u.RoleID = roleID
	}
	if err := s.repo.Update(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *UserService) Delete(ctx context.Context, tenantID, id string) error {
	u, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if u.TenantID != tenantID {
		return fmt.Errorf("forbidden")
	}
	return s.repo.Delete(ctx, id)
}

func (s *UserService) ToggleActive(ctx context.Context, tenantID, id string) (*domain.User, error) {
	u, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u.TenantID != tenantID {
		return nil, fmt.Errorf("forbidden")
	}
	u.IsActive = !u.IsActive
	if err := s.repo.Update(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}
// â”€â”€â”€ WorkflowService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

func (s *WorkflowService) Update(ctx context.Context, tenantID, id string, req SaveWorkflowRequest) (*domain.Workflow, error) {
	w, err := s.workflows.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if w.TenantID != tenantID {
		return nil, fmt.Errorf("forbidden")
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
func (s *WorkflowService) SetEnabled(ctx context.Context, tenantID, id string, enabled bool) (*domain.Workflow, error) {
	w, err := s.workflows.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if w.TenantID != tenantID {
		return nil, fmt.Errorf("forbidden")
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

func (s *WorkflowService) Delete(ctx context.Context, tenantID, id string) error {
	w, err := s.workflows.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if w.TenantID != tenantID {
		return fmt.Errorf("forbidden")
	}
	return s.workflows.Delete(ctx, id)
}

// GetRunByID returns the full execution record for a single run.
func (s *WorkflowService) GetRunByID(ctx context.Context, id string) (*domain.WorkflowRun, error) {
	return s.runs.FindByID(ctx, id)
}

// GetRuns returns the N most recent execution records for a workflow.
func (s *WorkflowService) GetRuns(ctx context.Context, tenantID, workflowID string, limit int) ([]domain.WorkflowRun, error) {
	wf, err := s.workflows.FindByID(ctx, workflowID)
	if err != nil {
		return nil, err
	}
	if wf.TenantID != tenantID {
		return nil, fmt.Errorf("forbidden")
	}
	if limit <= 0 {
		limit = 20
	}
	return s.runs.FindByWorkflow(ctx, workflowID, limit)
}

// ListRuns returns the most recent run summaries across all workflows for a tenant.
func (s *WorkflowService) ListRuns(ctx context.Context, tenantID string, limit int) ([]domain.WorkflowRunSummary, error) {
	if limit <= 0 {
		limit = 100
	}
	return s.runs.FindAllByTenant(ctx, tenantID, limit)
}

// Stats returns aggregated run statistics for all workflows belonging to a tenant
// over the last 24 hours.
func (s *WorkflowService) Stats(ctx context.Context, tenantID string) (*domain.TenantRunStats, error) {
	since := time.Now().UTC().Add(-24 * time.Hour)
	return s.runs.StatsForTenant(ctx, tenantID, since)
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
	Run  *domain.WorkflowRun    `json:"run"`
	Data map[string]interface{} `json:"data"` // pure agent response body
	Meta map[string]interface{} `json:"meta"` // diagnostics + internal flags
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

// getValueByPath extracts a value from a nested map using dot-notation.
// Trailing "[]" suffixes on path segments are stripped so that arrays are
// returned as-is (e.g. "islemler[]â€ â†’ the whole slice).
func getValueByPath(data map[string]interface{}, path string) (interface{}, bool) {
	path = strings.TrimSuffix(path, "[]")
	parts := strings.SplitN(path, ".", 2)
	if len(parts) == 0 || parts[0] == "" {
		return nil, false
	}
	key := strings.TrimSuffix(parts[0], "[]")
	val, ok := data[key]
	if !ok {
		return nil, false
	}
	if len(parts) == 1 {
		return val, true
	}
	if nested, ok2 := val.(map[string]interface{}); ok2 {
		return getValueByPath(nested, parts[1])
	}
	return nil, false
}

// remapArrayItems rebuilds each object in srcSlice by renaming fields per fieldMap
// (targetField → sourceField). Fields not listed in the map pass through unchanged.
func remapArrayItems(srcSlice []interface{}, fieldMap map[string]string) []interface{} {
	srcUsed := make(map[string]bool, len(fieldMap))
	for _, sf := range fieldMap {
		srcUsed[sf] = true
	}
	out := make([]interface{}, len(srcSlice))
	for i, item := range srcSlice {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			out[i] = item
			continue
		}
		newItem := make(map[string]interface{}, len(itemMap))
		for tf, sf := range fieldMap {
			if v, exists := itemMap[sf]; exists {
				newItem[tf] = v
			}
		}
		// Pass unmapped source fields through unchanged.
		for k, v := range itemMap {
			if !srcUsed[k] {
				if _, exists := newItem[k]; !exists {
					newItem[k] = v
				}
			}
		}
		out[i] = newItem
	}
	return out
}

// applyModelMappings builds the agent payload from the model_mapping node config.
// Config shape: { "targetPath": "sourcePath", ... }
//
// Supports three mapping types:
//   - Scalar/object:    "bankName"          → "bankaAdi"
//   - Whole array:      "transactions"      → "islemler[]"
//   - Array-item field: "transactions[].desc" → "islemler[].aciklama"
//
// When array-item field mappings exist, each item's fields are renamed accordingly;
// unmapped source fields pass through unchanged.
func applyModelMappings(mappings map[string]interface{}, payload map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})

	// First pass — collect array-item field rename rules.
	// "transactions[].desc" → "islemler[].aciklama" becomes:
	//   arrayFields["transactions"]["desc"] = "aciklama"
	//   arraySrc["transactions"]            = "islemler"
	arrayFields := make(map[string]map[string]string)
	arraySrc := make(map[string]string)

	for target, src := range mappings {
		srcPath, _ := src.(string)
		if srcPath == "" {
			continue
		}
		tIdx := strings.Index(target, "[].")
		if tIdx == -1 {
			continue
		}
		targetArr := target[:tIdx]
		targetField := target[tIdx+3:]
		var srcArr, srcField string
		if sIdx := strings.Index(srcPath, "[]."); sIdx != -1 {
			srcArr = srcPath[:sIdx]
			srcField = srcPath[sIdx+3:]
		} else {
			srcArr = strings.TrimSuffix(srcPath, "[]")
			srcField = targetField
		}
		if _, ok := arrayFields[targetArr]; !ok {
			arrayFields[targetArr] = make(map[string]string)
		}
		arrayFields[targetArr][targetField] = srcField
		if _, ok := arraySrc[targetArr]; !ok {
			arraySrc[targetArr] = srcArr
		}
	}

	// Second pass — process top-level and direct array mappings.
	processedArrays := make(map[string]bool)
	for target, src := range mappings {
		srcPath, _ := src.(string)
		if srcPath == "" || strings.Contains(target, "[].") {
			continue
		}
		targetKey := strings.TrimSuffix(target, "[]")
		cleanSrc := strings.TrimSuffix(srcPath, "[]")

		srcVal, ok := getValueByPath(payload, cleanSrc)
		if !ok {
			continue
		}
		if fieldMap, hasItemMappings := arrayFields[targetKey]; hasItemMappings {
			if srcSlice, isSlice := srcVal.([]interface{}); isSlice {
				result[targetKey] = remapArrayItems(srcSlice, fieldMap)
				processedArrays[targetKey] = true
				continue
			}
		}
		result[targetKey] = srcVal
	}

	// Third pass — arrays with only item-level mappings (no explicit array-level entry).
	for targetArr, srcArrName := range arraySrc {
		if processedArrays[targetArr] {
			continue
		}
		srcVal, ok := getValueByPath(payload, srcArrName)
		if !ok {
			continue
		}
		if srcSlice, isSlice := srcVal.([]interface{}); isSlice {
			result[targetArr] = remapArrayItems(srcSlice, arrayFields[targetArr])
		} else {
			result[targetArr] = srcVal
		}
	}

	return result
}

// callAgent makes an HTTP request to the agent endpoint.
// method is "POST", "GET", etc. For GET, no body is sent.
// Sends X-API-Key header if a secret is provided.
// Always returns a map with diagnostic fields.
func callAgent(ctx context.Context, method, endpoint, secret string, agentModel map[string]interface{}) map[string]interface{} {
	if endpoint == "" {
		return map[string]interface{}{"_agentError": "no endpoint configured"}
	}
	// Ensure the URL has a scheme; reject bare paths like "/api/Test/Real".
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		return map[string]interface{}{
			"_agentError":    "geçersiz endpoint: scheme (http:// veya https://) eksik — tenant agent ayarlarında tam URL girilmeli",
			"_agentEndpoint": endpoint,
		}
	}
	if method == "" {
		method = http.MethodPost
	}
	var bodyBytes []byte
	var bodyReader *bytes.Reader
	if method != http.MethodGet && method != http.MethodHead {
		var err error
		bodyBytes, err = json.Marshal(agentModel)
		if err != nil {
			return map[string]interface{}{"_agentError": "marshal error: " + err.Error()}
		}
		bodyReader = bytes.NewReader(bodyBytes)
	} else {
		bodyReader = bytes.NewReader(nil)
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, bodyReader)
	if err != nil {
		return map[string]interface{}{"_agentError": "bad endpoint URL: " + err.Error(), "_agentEndpoint": endpoint}
	}
	if method != http.MethodGet && method != http.MethodHead {
		req.Header.Set("Content-Type", "application/json")
	}
	if secret != "" {
		req.Header.Set("X-API-Key", secret)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return map[string]interface{}{"_agentError": err.Error(), "_agentEndpoint": endpoint}
	}
	defer resp.Body.Close() //nolint:errcheck
	respBodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		out := map[string]interface{}{
			"_agentError":      fmt.Sprintf("HTTP %d", resp.StatusCode),
			"_agentEndpoint":   endpoint,
			"_agentStatusCode": resp.StatusCode,
		}
		// Include the agent's error response body so the caller can see the reason
		if len(respBodyBytes) > 0 {
			var errBody interface{}
			if json.Unmarshal(respBodyBytes, &errBody) == nil {
				out["_agentErrorBody"] = errBody
			} else {
				out["_agentErrorBody"] = string(respBodyBytes)
			}
		}
		// Include the request body that was sent so the caller can debug
		if len(bodyBytes) > 0 {
			var sentBody interface{}
			if json.Unmarshal(bodyBytes, &sentBody) == nil {
				out["_agentSentBody"] = sentBody
			}
		}
		return out
	}
	var result map[string]interface{}
	if err := json.Unmarshal(respBodyBytes, &result); err != nil {
		// Non-JSON or empty response â€” treat as success
		return map[string]interface{}{"_agentCalled": true, "_agentEndpoint": endpoint, "_agentStatusCode": resp.StatusCode}
	}
	result["_agentEndpoint"] = endpoint
	result["_agentStatusCode"] = resp.StatusCode
	return result
}

// reachableNodes returns the IDs of nodes reachable from any trigger node by
// following the directed edge graph. Nodes not connected to a trigger are excluded.
func reachableNodes(nodes []domain.WorkflowNode, edges []domain.WorkflowEdge) map[string]struct{} {
	adj := make(map[string][]string, len(edges))
	for _, e := range edges {
		adj[e.Source] = append(adj[e.Source], e.Target)
	}
	visited := make(map[string]struct{}, len(nodes))
	queue := []string{}
	for _, n := range nodes {
		if strings.HasPrefix(n.Type, "trigger_") {
			queue = append(queue, n.ID)
		}
	}
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		if _, seen := visited[cur]; seen {
			continue
		}
		visited[cur] = struct{}{}
		for _, next := range adj[cur] {
			if _, seen := visited[next]; !seen {
				queue = append(queue, next)
			}
		}
	}
	return visited
}

// Trigger executes the full trigger logic for a workflow:
//  1. Fetch the workflow and its nodes
//  2. Determine the connected subgraph from trigger nodes via edges
//  3. Apply field mappings only from connected transform_mapping nodes
//  4. Scan connected nodes: feature flags + agent URL/method
//  5. Build the agent model and attempt to call the configured agent endpoint
//  6. Record the run
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

	// Step 1: Determine which nodes are reachable from a trigger via edges.
	reachable := reachableNodes(wf.Nodes, wf.Edges)

	// Step 2: Apply field mappings only from connected transform_mapping nodes.
	mappedPayload := make(map[string]interface{}, len(userPayload))
	for k, v := range userPayload {
		mappedPayload[k] = v
	}
	for _, node := range wf.Nodes {
		if _, ok := reachable[node.ID]; !ok {
			continue
		}
		if node.Type == "transform_mapping" {
			mappedPayload = applyFieldMappings(node, mappedPayload)
		}
	}

	// Step 3: Look up the tenant agent configuration (endpoint + secret).
	var agentEndpoint, agentSecret string
	if ta, err := s.agentRepo.FindByTenant(ctx, tenantID); err == nil && ta.IsActive {
		agentEndpoint = ta.EndpointURL
		agentSecret = ta.SecretKey
	}

	// Step 4: Scan connected nodes â€” collect feature flags and build the full agent URL + method.
	hasCariCheck := false
	cariCheckFlagName := "cariKontrolEdilecekMi" // configurable via node's flagName field
	cariCheckFlagValue := true                    // configurable via node's boolean config
	cariCheckNodeID := ""                         // used to look up cariKod connection
	hasAgentRequest := false
	hasModelMapping := false
	var modelMappingConfig map[string]interface{}
	agentMethod := http.MethodPost
	for _, node := range wf.Nodes {
		if _, ok := reachable[node.ID]; !ok {
			continue
		}
		switch node.Type {
		case "custom_cari_check", "custom_cari_kontrol":
			hasCariCheck = true
			cariCheckNodeID = node.ID
			// Read configurable flag name from node config.
			if fn, ok := node.Config["flagName"].(string); ok && fn != "" {
				cariCheckFlagName = fn
			}
			// Read the boolean flag value from node config (defaults to true).
			if cv, ok := node.Config["cariKontrolEdilecekMi"]; ok {
				switch v := cv.(type) {
				case bool:
					cariCheckFlagValue = v
				case string:
					cariCheckFlagValue = v == "true"
				}
			}
		case "model_mapping":
			if ms, ok := node.Config["mappings"]; ok {
				if mm, ok2 := ms.(map[string]interface{}); ok2 && len(mm) > 0 {
					hasModelMapping = true
					modelMappingConfig = mm
				}
			}
		case "agent_request":
			hasAgentRequest = true
			// Combine tenant base URL + node path.
			if path, ok := node.Config["agentEndpoint"].(string); ok && path != "" {
				// If the node value is already a full URL (has a scheme), use it directly.
				if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
					agentEndpoint = path
				} else {
					base := strings.TrimRight(agentEndpoint, "/")
					p := "/" + strings.TrimLeft(path, "/")
					agentEndpoint = base + p
				}
			}
			// HTTP method from node config (default POST).
			if m, ok := node.Config["httpMethod"].(string); ok && m != "" {
				agentMethod = strings.ToUpper(m)
			}
		}
	}

	// Step 5: Build the structured payload that will be sent to the local Agent.
	// The final body shape is:
	//   { "_meta": { ...feature flags... }, "data": { ...model fields... } }
	// workflowId and triggeredAt go only into the run record, NOT into the agent body.
	triggeredAt := time.Now().UTC()
	var dataFields map[string]interface{}
	if hasModelMapping {
		dataFields = applyModelMappings(modelMappingConfig, mappedPayload)
	} else {
		dataFields = make(map[string]interface{}, len(mappedPayload))
		for k, v := range mappedPayload {
			dataFields[k] = v
		}
	}

	// Build _meta section â€” populated by special control nodes.
	metaFields := make(map[string]interface{})
	if hasCariCheck {
		metaFields[cariCheckFlagName] = cariCheckFlagValue
		// If the cariKod input handle is connected, resolve the value from the payload.
		for _, edge := range wf.Edges {
			if edge.Target == cariCheckNodeID && edge.TargetHandle == "cariKod" {
				if val, ok := getValueByPath(mappedPayload, "cariKod"); ok {
					metaFields["cariKod"] = val
				} else if val, ok := getValueByPath(mappedPayload, edge.SourceHandle); ok && edge.SourceHandle != "" && edge.SourceHandle != "output" {
					metaFields["cariKod"] = val
				}
				break
			}
		}
	}

	// Compose the final agent model: _meta at top level alongside data fields.
	agentModel := make(map[string]interface{}, len(dataFields)+1)
	for k, v := range dataFields {
		agentModel[k] = v
	}
	agentModel["_meta"] = metaFields

	// Step 6: Attempt agent call only if an agent_request node is in the connected flow.
	var agentResponse map[string]interface{}
	if hasAgentRequest {
		if agentEndpoint == "" {
			// agent_request node found but no endpoint configured (tenant agent not set or node not connected)
			agentResponse = map[string]interface{}{"_agentError": "agent_request node'u bağlı ancak tenant agent endpoint'i yapılandırılmamış"}
		} else {
			agentResponse = callAgent(ctx, agentMethod, agentEndpoint, agentSecret, agentModel)
		}
	} else {
		// No agent_request node in the connected graph — workflow is incomplete
		agentResponse = map[string]interface{}{"_agentError": "workflow'da bağlı bir agent_request node'u yok — node bağlantılarını kontrol edin"}
	}
	agentData := make(map[string]interface{})
	agentMeta := map[string]interface{}{
		"workflowId":  workflowID,
		"triggeredAt": triggeredAt,
	}
	for k, v := range agentResponse {
		if len(k) > 0 && k[0] == '_' {
			agentMeta[k] = v
		} else {
			agentData[k] = v
		}
	}
	if _, hasErr := agentResponse["_agentError"]; !hasErr {
		agentMeta["_agentCalled"] = true
	}
	// resultPayload stored in DB combines both for full record-keeping
	resultPayload := make(map[string]interface{})
	for k, v := range agentMeta {
		resultPayload[k] = v
	}
	for k, v := range agentData {
		resultPayload[k] = v
	}

	// Step 7: Record the run.
	// If the agent returned an error (any _agentError key), the run is FAILED.
	_, runFailed := agentResponse["_agentError"]
	runStatus := domain.RunStatusSuccess
	if runFailed {
		runStatus = domain.RunStatusFailed
	}
	now := time.Now().UTC()
	durationMs := now.Sub(triggeredAt).Milliseconds()
	run := &domain.WorkflowRun{
		ID:         uuid.New().String(),
		WorkflowID: workflowID,
		TenantID:   tenantID,
		Status:     runStatus,
		DurationMs: durationMs,
		Payload:    userPayload,
		Result:     resultPayload,
		StartedAt:  triggeredAt,
		FinishedAt: &now,
	}
	if runFailed {
		errMsg, _ := agentMeta["_agentError"].(string)
		if body, ok := agentMeta["_agentErrorBody"]; ok {
			if bs, err := json.Marshal(body); err == nil {
				errMsg = errMsg + " — " + string(bs)
			}
		}
		run.ErrorMsg = errMsg
	}
	if err := s.runs.Create(ctx, run); err != nil {
		return nil, err
	}
	_ = s.workflows.IncrementStats(ctx, workflowID, !runFailed, durationMs)

	return &TriggerResult{
		Run:  run,
		Data: agentData,
		Meta: agentMeta,
	}, nil
}

// â”€â”€â”€ ApiEndpointService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ CariKontrolService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ AgentService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
