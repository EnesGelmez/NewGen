// Package router wires all HTTP routes together.
package router

import (
	"net/http"

	"github.com/newgen/backend/internal/handler"
	"github.com/newgen/backend/internal/middleware"
	"github.com/newgen/backend/internal/service"
)

// New builds and returns the root http.Handler.
//
// Route structure:
//
//	/api/v1/auth/*                      — public (login / logout)
//	/api/v1/tenants/*                   — JWT + SUPER_ADMIN
//	/api/v1/workflows/*                 — JWT (any tenant user)
//	/api/v1/endpoints/*                 — JWT (any tenant user)
//	/api/v1/agent/*                     — JWT (any tenant user) or API-Key
//	/api/v1/cari-kontrol                — API-Key (external callers)
//	/swagger/*                          — public Swagger UI + OpenAPI spec
func New(
	jwtSvc *service.JWTService,
	apiKeys map[string]string,
	authH *handler.AuthHandler,
	tenantH *handler.TenantHandler,
	workflowH *handler.WorkflowHandler,
	endpointH *handler.ApiEndpointHandler,
	cariH *handler.CariKontrolHandler,
	agentH *handler.AgentHandler,
	tenantAgentH *handler.TenantAgentHandler,
) http.Handler {

	mux := http.NewServeMux()

	// ─── Auth (public) ────────────────────────────────────────────────────────
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
	mux.HandleFunc("POST /api/v1/auth/logout", authH.Logout)
	mux.HandleFunc("GET /api/v1/auth/me", chain(authH.Me, middleware.Auth(jwtSvc)))

	// ─── Tenants (super-admin) ────────────────────────────────────────────────
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

	// ─── Tenant Agent config (super-admin) ────────────────────────────────────────────────
	mux.HandleFunc("GET /api/v1/tenants/{id}/agent",
		chain(tenantAgentH.Get, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
	mux.HandleFunc("PUT /api/v1/tenants/{id}/agent",
		chain(tenantAgentH.Save, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
	mux.HandleFunc("DELETE /api/v1/tenants/{id}/agent",
		chain(tenantAgentH.Delete, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))
	mux.HandleFunc("POST /api/v1/tenants/{id}/agent/generate-secret",
		chain(tenantAgentH.GenerateSecret, middleware.Auth(jwtSvc), middleware.RequireRole("SUPER_ADMIN")))

	// ─── Workflows ────────────────────────────────────────────────────────────
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
	mux.HandleFunc("POST /api/v1/workflows/{id}/trigger",
		chain(workflowH.Trigger, middleware.Auth(jwtSvc)))

	// ─── API Endpoints registry ───────────────────────────────────────────────
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

	// ─── Cari Kontrol (external callers use API-Key) ──────────────────────────
	mux.HandleFunc("POST /api/v1/cari-kontrol",
		chain(cariH.Check, middleware.APIKeyAuth(apiKeys)))

	// ─── Public Webhooks (external systems trigger workflows via API-Key) ─────
	mux.HandleFunc("POST /api/v1/webhooks/{workflowId}",
		chain(workflowH.Webhook, middleware.APIKeyAuth(apiKeys)))

	// ─── Agent ────────────────────────────────────────────────────────────────
	mux.HandleFunc("GET /api/v1/agent/status",
		chain(agentH.Status, middleware.Auth(jwtSvc)))
	mux.HandleFunc("POST /api/v1/agent/heartbeat",
		chain(agentH.Heartbeat, middleware.APIKeyAuth(apiKeys)))
	mux.HandleFunc("POST /api/v1/agent/process",
		chain(agentH.Process, middleware.APIKeyAuth(apiKeys)))

	// ─── Health check (public) ────────────────────────────────────────────────
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`)) //nolint:errcheck
	})

	// ─── Swagger UI + OpenAPI spec (public) ──────────────────────────────────
	swaggerH := handler.NewSwaggerHandler()
	mux.Handle("/swagger/", swaggerH)
	// Redirect /swagger → /swagger/ for convenience
	mux.HandleFunc("GET /swagger", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/swagger/", http.StatusMovedPermanently)
	})

	return mux
}

// chain wraps a HandlerFunc with zero or more middleware constructors (innermost first).
// Usage: chain(myHandler, middlewareA, middlewareB)
// → middlewareA(middlewareB(http.HandlerFunc(myHandler)))
func chain(h http.HandlerFunc, middlewares ...func(http.Handler) http.Handler) http.HandlerFunc {
	var handler http.Handler = h
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler.ServeHTTP
}
