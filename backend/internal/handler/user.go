package handler

import (
	"net/http"

	"github.com/nexus/backend/internal/service"
)

// UserHandler serves /api/v1/users.
type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

// GET /api/v1/users
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	users, err := h.svc.List(r.Context(), claims.TenantID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, users)
}

// POST /api/v1/users
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	var req service.CreateUserRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "geçersiz istek gövdesi")
		return
	}
	user, err := h.svc.Create(r.Context(), claims.TenantID, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respond(w, http.StatusCreated, user)
}

// PUT /api/v1/users/{id}
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req service.UpdateUserRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "geçersiz istek gövdesi")
		return
	}
	user, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respond(w, http.StatusOK, user)
}

// DELETE /api/v1/users/{id}
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// PATCH /api/v1/users/{id}/toggle
func (h *UserHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	user, err := h.svc.ToggleActive(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respond(w, http.StatusOK, user)
}
