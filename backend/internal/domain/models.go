// Package domain holds all core business entities and value objects.
// No framework or infrastructure dependency is allowed here.
package domain

import "time"

// â”€â”€â”€ Tenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// TenantStatus represents the lifecycle state of a tenant.
type TenantStatus string

const (
	TenantStatusActive    TenantStatus = "ACTIVE"
	TenantStatusSuspended TenantStatus = "SUSPENDED"
	TenantStatusTrial     TenantStatus = "TRIAL"
)

// Tenant is a customer organisation that uses the integration platform.
type Tenant struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Subdomain   string       `json:"subdomain"`
	Email       string       `json:"email"`
	Status      TenantStatus `json:"status"`
	Plan        string       `json:"plan"`
	APIKey      string       `json:"apiKey,omitempty"` // incoming webhook auth key (shown only to tenant owners)
	AgentToken  string       `json:"-"`                // outgoing agent secret â€“ never serialise
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

// â”€â”€â”€ User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// UserRole defines the permission level of a platform user.
type UserRole string

const (
	UserRoleSuperAdmin UserRole = "SUPER_ADMIN"
	UserRoleTenantAdmin UserRole = "TENANT_ADMIN"
	UserRoleViewer     UserRole = "VIEWER"
)

// User represents a human operator who can log in to the platform.
type User struct {
	ID                 string    `json:"id"`
	TenantID           string    `json:"tenantId,omitempty"` // empty for SUPER_ADMIN
	Name               string    `json:"name"`
	Email              string    `json:"email"`
	PasswordHash       string    `json:"-"`
	Role               UserRole  `json:"role"`
	IsActive           bool      `json:"isActive"`
	MustChangePassword bool      `json:"mustChangePassword"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// â”€â”€â”€ Workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// WorkflowStatus captures whether a workflow is accepting new runs.
type WorkflowStatus string

const (
	WorkflowStatusActive   WorkflowStatus = "ACTIVE"
	WorkflowStatusDisabled WorkflowStatus = "DISABLED"
)

// WorkflowNode is a single step/block on the workflow canvas.
type WorkflowNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`     // maps to NODE_TYPES key in frontend
	Label    string                 `json:"label"`
	Position map[string]float64     `json:"position"` // {x, y}
	Config   map[string]interface{} `json:"config"`   // user-configured values
}

// WorkflowEdge connects two nodes.
type WorkflowEdge struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	SourceHandle string `json:"sourceHandle"`
	Target       string `json:"target"`
	TargetHandle string `json:"targetHandle"`
}

// WorkflowStats holds aggregated execution counters for a workflow.
type WorkflowStats struct {
	TotalRuns      int64   `json:"totalRuns"`
	SuccessRuns    int64   `json:"successRuns"`
	FailedRuns     int64   `json:"failedRuns"`
	AvgDurationMs  float64 `json:"avgDurationMs"`
	LastDayRuns    int64   `json:"lastDayRuns"`
	LastDaySuccess int64   `json:"lastDaySuccess"`
	LastDayFailed  int64   `json:"lastDayFailed"`
	Trend          string  `json:"trend"` // "up" | "down" | "neutral"
}

// Workflow is the top-level entity that groups nodes + edges into an automation.
type Workflow struct {
	ID              string         `json:"id"`
	TenantID        string         `json:"tenantId"`
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	Status          WorkflowStatus `json:"status"`
	Trigger         string         `json:"trigger"`
	Nodes           []WorkflowNode `json:"nodes"`
	Edges           []WorkflowEdge `json:"edges"`
	Stats           WorkflowStats  `json:"stats"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	LastRunAt       *time.Time     `json:"lastRunAt,omitempty"`
}

// â”€â”€â”€ WorkflowRun â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// RunStatus represents the outcome of a single workflow execution.
type RunStatus string

const (
	RunStatusRunning RunStatus = "RUNNING"
	RunStatusSuccess RunStatus = "SUCCESS"
	RunStatusFailed  RunStatus = "FAILED"
)

// WorkflowRun is an individual execution record for a workflow.
type WorkflowRun struct {
	ID          string                 `json:"id"`
	WorkflowID  string                 `json:"workflowId"`
	TenantID    string                 `json:"tenantId"`
	Status      RunStatus              `json:"status"`
	DurationMs  int64                  `json:"durationMs"`
	Payload     map[string]interface{} `json:"payload,omitempty"`
	Result      map[string]interface{} `json:"result,omitempty"`
	ErrorMsg    string                 `json:"errorMsg,omitempty"`
	StartedAt   time.Time              `json:"startedAt"`
	FinishedAt  *time.Time             `json:"finishedAt,omitempty"`
}

// â”€â”€â”€ TenantRunStats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// WorkflowRunSummary is a lightweight run record used in dashboard stats and log pages.
type WorkflowRunSummary struct {
	RunID        string    `json:"runId"`
	WorkflowID   string    `json:"workflowId"`
	WorkflowName string    `json:"workflowName"`
	Status       string    `json:"status"`
	ErrorMsg     string    `json:"errorMsg,omitempty"`
	StartedAt    time.Time `json:"startedAt"`
	DurationMs   int64     `json:"durationMs"`
}

// TenantRunStats holds aggregated execution stats across all workflows for a tenant.
type TenantRunStats struct {
	Total           int                  `json:"total"`
	Successful      int                  `json:"successful"`
	Failed          int                  `json:"failed"`
	ActiveWorkflows int                  `json:"activeWorkflows"`
	RecentRuns      []WorkflowRunSummary `json:"recentRuns"`
}

// â”€â”€â”€ ApiEndpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// EndpointMethod is an HTTP verb.
type EndpointMethod string

const (
	MethodGET    EndpointMethod = "GET"
	MethodPOST   EndpointMethod = "POST"
	MethodPUT    EndpointMethod = "PUT"
	MethodDELETE EndpointMethod = "DELETE"
)

// EndpointAuthType specifies how callers must authenticate.
type EndpointAuthType string

const (
	AuthAPIKey EndpointAuthType = "API_KEY"
	AuthBearer EndpointAuthType = "BEARER"
	AuthNone   EndpointAuthType = "NONE"
)

// EndpointParam describes a single input parameter for an API endpoint.
type EndpointParam struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description"`
}

// ApiEndpoint is an externally-callable HTTP endpoint managed by the platform.
type ApiEndpoint struct {
	ID          string           `json:"id"`
	TenantID    string           `json:"tenantId"`
	Name        string           `json:"name"`
	Slug        string           `json:"slug"`
	Method      EndpointMethod   `json:"method"`
	Path        string           `json:"path"`
	Description string           `json:"description"`
	Enabled     bool             `json:"enabled"`
	Auth        EndpointAuthType `json:"auth"`
	Category    string           `json:"category"`
	Parameters  []EndpointParam  `json:"parameters"`
	Response    EndpointResponse `json:"response"`
	TestMode    bool             `json:"testMode"`
	CallCount   int64            `json:"callCount"`
	LastCalledAt *time.Time      `json:"lastCalledAt,omitempty"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
}

// EndpointResponse contains the documented response shape.
type EndpointResponse struct {
	Type    string `json:"type"`
	Example string `json:"example"`
}

// â”€â”€â”€ Agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// AgentStatus captures whether the local agent is reachable.
type AgentStatus string

const (
	AgentOnline  AgentStatus = "ONLINE"
	AgentOffline AgentStatus = "OFFLINE"
)

// Agent represents a local LOGO ERP bridge agent installed on-premise.
type Agent struct {
	ID            string      `json:"id"`
	TenantID      string      `json:"tenantId"`
	Hostname      string      `json:"hostname"`
	Version       string      `json:"version"`
	Status        AgentStatus `json:"status"`
	LastHeartbeat *time.Time  `json:"lastHeartbeat,omitempty"`
	RegisteredAt  time.Time   `json:"registeredAt"`
}

// â”€â”€â”€ TenantAgent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// TenantAgent holds the outbound API configuration for a tenant's LOGO ERP integration.
// Super Admins create/update this; the Trigger pipeline uses it to call the agent endpoint.
type TenantAgent struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	Name        string    `json:"name"`
	EndpointURL string    `json:"endpointUrl"`
	SecretKey   string    `json:"secretKey"`  // shown only to Super Admin
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// â”€â”€â”€ CariKontrol (Cari Check) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// CariKontrolRequest is the payload sent to the Cari Kontrol endpoint.
type CariKontrolRequest struct {
	CariKod string `json:"cariKod"`
}

// CariKontrolResponse is what the cloud returns to the caller.
type CariKontrolResponse struct {
	Success                bool   `json:"success"`
	CariKontrolEdilecekMi  bool   `json:"cariKontrolEdilecekMi"`
	CariKod                string `json:"cariKod"`
}

// AgentCariKontrolModel is the enriched model the cloud sends to the Agent.
type AgentCariKontrolModel struct {
	CariKod                string                 `json:"cariKod"`
	CariKontrolEdilecekMi  bool                   `json:"cariKontrolEdilecekMi"`
	AdditionalData         map[string]interface{} `json:"additionalData,omitempty"`
}

// AgentProcessRequest is the payload the cloud posts to the local Agent.
type AgentProcessRequest struct {
	RunID   string                 `json:"runId"`
	Model   map[string]interface{} `json:"model"`
}

// AgentProcessResponse is what the Agent returns after processing.
type AgentProcessResponse struct {
	Success      bool                   `json:"success"`
	CariMevcut   bool                   `json:"cariMevcut,omitempty"`
	Result       map[string]interface{} `json:"result,omitempty"`
	ErrorMessage string                 `json:"errorMessage,omitempty"`
}
