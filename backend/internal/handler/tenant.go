package handler

import (
	"net/http"

	"github.com/nexus/backend/internal/service"
)

// TenantHandler serves /api/v1/tenants (super-admin only).
type TenantHandler struct {
	svc *service.TenantService
}

func NewTenantHandler(svc *service.TenantService) *TenantHandler {
	return &TenantHandler{svc: svc}
}

// GET /api/v1/tenant/me  â€“ returns the current tenant's settings including API key.
// Available to any authenticated tenant user (not super-admin).
func (h *TenantHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	if claims == nil || claims.TenantID == "" {
		respondError(w, http.StatusForbidden, "not a tenant user")
		return
	}
	t, err := h.svc.GetForOwner(r.Context(), claims.TenantID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, t)
}

// GET /api/v1/tenants
func (h *TenantHandler) List(w http.ResponseWriter, r *http.Request) {
	tenants, err := h.svc.List(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, tenants)
}

// GET /api/v1/tenants/{id}
func (h *TenantHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	t, err := h.svc.Get(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, t)
}

// POST /api/v1/tenants
func (h *TenantHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req service.CreateTenantRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	t, err := h.svc.Create(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	respond(w, http.StatusCreated, t)
}

// PUT /api/v1/tenants/{id}
func (h *TenantHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req service.CreateTenantRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	t, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	respond(w, http.StatusOK, t)
}

// DELETE /api/v1/tenants/{id}
func (h *TenantHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
