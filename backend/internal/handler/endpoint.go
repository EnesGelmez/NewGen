package handler

import (
	"net/http"

	"github.com/nexus/backend/internal/service"
)

// ApiEndpointHandler serves /api/v1/endpoints.
type ApiEndpointHandler struct {
	svc *service.ApiEndpointService
}

func NewApiEndpointHandler(svc *service.ApiEndpointService) *ApiEndpointHandler {
	return &ApiEndpointHandler{svc: svc}
}

// GET /api/v1/endpoints
func (h *ApiEndpointHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	eps, err := h.svc.List(r.Context(), claims.TenantID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, eps)
}

// GET /api/v1/endpoints/{id}
func (h *ApiEndpointHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ep, err := h.svc.Get(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, ep)
}

// POST /api/v1/endpoints
func (h *ApiEndpointHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	var req service.CreateEndpointRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ep, err := h.svc.Create(r.Context(), claims.TenantID, req)
	if err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	respond(w, http.StatusCreated, ep)
}

// PATCH /api/v1/endpoints/{id}/enable
func (h *ApiEndpointHandler) Enable(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ep, err := h.svc.SetEnabled(r.Context(), id, true)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, ep)
}

// PATCH /api/v1/endpoints/{id}/disable
func (h *ApiEndpointHandler) Disable(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ep, err := h.svc.SetEnabled(r.Context(), id, false)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, ep)
}

// DELETE /api/v1/endpoints/{id}
func (h *ApiEndpointHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
