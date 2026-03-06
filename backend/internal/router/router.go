// Package router wires all HTTP routes together.
package router

import (
"context"
"net/http"

"github.com/nexus/backend/internal/handler"
"github.com/nexus/backend/internal/middleware"
"github.com/nexus/backend/internal/service"
)

// New builds and returns the root http.Handler.
func New(
jwtSvc *service.JWTService,
tenantSvc *service.TenantService,
authH *handler.AuthHandler,
tenantH *handler.TenantHandler,
workflowH *handler.WorkflowHandler,
endpointH *handler.ApiEndpointHandler,
cariH *handler.CariKontrolHandler,
agentH *handler.AgentHandler,
tenantAgentH *handler.TenantAgentHandler,
userH *handler.UserHandler,
) http.Handler {

apiKeyResolver := func(ctx context.Context, key string) (string, error) {
return tenantSvc.LookupByAPIKey(ctx, key)
}

mux := http.NewServeMux()

// Auth (public)
mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
mux.HandleFunc("POST /api/v1/auth/logout", authH.Logout)
mux.HandleFunc("GET /api/v1/auth/me", chain(authH.Me, middleware.Auth(jwtSvc)))
mux.HandleFunc("POST /api/v1/auth/change-password",
	chain(authH.ChangePassword, middleware.Auth(jwtSvc)))

// Users (tenant-admin)
mux.HandleFunc("GET /api/v1/users",
	chain(userH.List, middleware.Auth(jwtSvc)))
mux.HandleFunc("POST /api/v1/users",
	chain(userH.Create, middleware.Auth(jwtSvc), middleware.RequireRole("TENANT_ADMIN")))
mux.HandleFunc("PUT /api/v1/users/{id}",
	chain(userH.Update, middleware.Auth(jwtSvc), middleware.RequireRole("TENANT_ADMIN")))
mux.HandleFunc("DELETE /api/v1/users/{id}",
	chain(userH.Delete, middleware.Auth(jwtSvc), middleware.RequireRole("TENANT_ADMIN")))
mux.HandleFunc("PATCH /api/v1/users/{id}/toggle",
	chain(userH.Toggle, middleware.Auth(jwtSvc), middleware.RequireRole("TENANT_ADMIN")))

// Tenant self-service
mux.HandleFunc("GET /api/v1/tenant/me",
chain(tenantH.Me, middleware.Auth(jwtSvc)))

// Tenants (super-admin)
mux.HandleFunc("GET /api/v1/tenants",
chain(tenantH.List, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
mux.HandleFunc("GET /api/v1/tenants/{id}",
chain(tenantH.Get, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
mux.HandleFunc("POST /api/v1/tenants",
chain(tenantH.Create, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
mux.HandleFunc("PUT /api/v1/tenants/{id}",
chain(tenantH.Update, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
mux.HandleFunc("DELETE /api/v1/tenants/{id}",
chain(tenantH.Delete, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))

// Tenant Agent config (super-admin)
mux.HandleFunc("GET /api/v1/tenants/{id}/agent",
chain(tenantAgentH.Get, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
mux.HandleFunc("PUT /api/v1/tenants/{id}/agent",
chain(tenantAgentH.Save, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
mux.HandleFunc("DELETE /api/v1/tenants/{id}/agent",
chain(tenantAgentH.Delete, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
mux.HandleFunc("POST /api/v1/tenants/{id}/agent/generate-secret",
chain(tenantAgentH.GenerateSecret, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))

// Workflows
mux.HandleFunc("GET /api/v1/workflows/stats",
chain(workflowH.Stats, middleware.Auth(jwtSvc)))
mux.HandleFunc("GET /api/v1/workflows",
chain(workflowH.List, middleware.Auth(jwtSvc)))
mux.HandleFunc("GET /api/v1/workflows/{id}",
chain(workflowH.Get, middleware.Auth(jwtSvc)))
mux.HandleFunc("POST /api/v1/workflows",
chain(workflowH.Create, middleware.Auth(jwtSvc)))
mux.HandleFunc("PUT /api/v1/workflows/{id}",
chain(workflowH.Update, middleware.Auth(jwtSvc)))
mux.HandleFunc("DELETE /api/v1/workflows/{id}",
chain(workflowH.Delete, middleware.Auth(jwtSvc)))
mux.HandleFunc("PATCH /api/v1/workflows/{id}/enable",
chain(workflowH.Enable, middleware.Auth(jwtSvc)))
mux.HandleFunc("PATCH /api/v1/workflows/{id}/disable",
chain(workflowH.Disable, middleware.Auth(jwtSvc)))
mux.HandleFunc("GET /api/v1/workflows/{id}/runs",
chain(workflowH.Runs, middleware.Auth(jwtSvc)))
mux.HandleFunc("GET /api/v1/runs",
	chain(workflowH.ListRuns, middleware.Auth(jwtSvc)))
mux.HandleFunc("GET /api/v1/runs/{id}",
	chain(workflowH.GetRun, middleware.Auth(jwtSvc)))
mux.HandleFunc("POST /api/v1/workflows/{id}/trigger",
chain(workflowH.Trigger, middleware.Auth(jwtSvc)))

// API Endpoints registry
mux.HandleFunc("GET /api/v1/endpoints",
chain(endpointH.List, middleware.Auth(jwtSvc)))
mux.HandleFunc("GET /api/v1/endpoints/{id}",
chain(endpointH.Get, middleware.Auth(jwtSvc)))
mux.HandleFunc("POST /api/v1/endpoints",
chain(endpointH.Create, middleware.Auth(jwtSvc)))
mux.HandleFunc("PATCH /api/v1/endpoints/{id}/enable",
chain(endpointH.Enable, middleware.Auth(jwtSvc)))
mux.HandleFunc("PATCH /api/v1/endpoints/{id}/disable",
chain(endpointH.Disable, middleware.Auth(jwtSvc)))
mux.HandleFunc("DELETE /api/v1/endpoints/{id}",
chain(endpointH.Delete, middleware.Auth(jwtSvc)))

// Cari Kontrol (external callers use API-Key)
mux.HandleFunc("POST /api/v1/cari-kontrol",
chain(cariH.Check, middleware.APIKeyAuth(apiKeyResolver)))

// Webhooks (external systems trigger workflows via API-Key)
mux.HandleFunc("POST /api/v1/webhooks/{workflowId}",
chain(workflowH.Webhook, middleware.APIKeyAuth(apiKeyResolver)))

// Agent
mux.HandleFunc("GET /api/v1/agent/status",
chain(agentH.Status, middleware.Auth(jwtSvc)))
mux.HandleFunc("POST /api/v1/agent/heartbeat",
chain(agentH.Heartbeat, middleware.APIKeyAuth(apiKeyResolver)))
mux.HandleFunc("POST /api/v1/agent/process",
chain(agentH.Process, middleware.APIKeyAuth(apiKeyResolver)))

// Health check (public)
mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
w.Header().Set("Content-Type", "application/json")
w.Write([]byte(`{"status":"ok"}`)) //nolint:errcheck
})

// Swagger UI + OpenAPI spec (public)
swaggerH := handler.NewSwaggerHandler()
mux.Handle("/swagger/", swaggerH)
mux.HandleFunc("GET /swagger", func(w http.ResponseWriter, r *http.Request) {
http.Redirect(w, r, "/swagger/", http.StatusMovedPermanently)
})

return mux
}

// chain wraps a HandlerFunc with zero or more middleware constructors (innermost first).
func chain(h http.HandlerFunc, middlewares ...func(http.Handler) http.Handler) http.HandlerFunc {
var handler http.Handler = h
for i := len(middlewares) - 1; i >= 0; i-- {
handler = middlewares[i](handler)
}
return handler.ServeHTTP
}
