package handler

import (
	"net/http"

	"github.com/newgen/backend/internal/service"
)

// TenantAgentHandler serves /api/v1/tenants/{id}/agent (super-admin only).
type TenantAgentHandler struct {
	svc *service.TenantAgentService
}

func NewTenantAgentHandler(svc *service.TenantAgentService) *TenantAgentHandler {
	return &TenantAgentHandler{svc: svc}
}

// GET /api/v1/tenants/{id}/agent
func (h *TenantAgentHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	a, err := h.svc.Get(r.Context(), tenantID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, a)
}

// PUT /api/v1/tenants/{id}/agent — create or update the agent configuration.
func (h *TenantAgentHandler) Save(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	var req service.SaveTenantAgentRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.EndpointURL == "" {
		respondError(w, http.StatusBadRequest, "endpointUrl is required")
		return
	}
	// Auto-generate secret if not provided
	if req.SecretKey == "" {
		req.SecretKey = h.svc.GenerateSecret()
	}
	a, err := h.svc.Save(r.Context(), tenantID, req)
	if err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	respond(w, http.StatusOK, a)
}

// DELETE /api/v1/tenants/{id}/agent
func (h *TenantAgentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID := r.PathValue("id")
	if err := h.svc.Delete(r.Context(), tenantID); err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v1/tenants/{id}/agent/generate-secret — convenience: just get a new secret key.
func (h *TenantAgentHandler) GenerateSecret(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusOK, map[string]string{"secretKey": h.svc.GenerateSecret()})
}
