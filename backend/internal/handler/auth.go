package handler

import (
	"net/http"

	"github.com/nexus/backend/internal/service"
)

// AuthHandler handles login / logout.
type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req service.LoginRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}
	respond(w, http.StatusOK, resp)
}

// POST /api/v1/auth/logout  (client-side token discard; server is stateless)
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// GET /api/v1/auth/me
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	respond(w, http.StatusOK, map[string]any{
		"userId":   claims.UserID,
		"tenantId": claims.TenantID,
		"role":     claims.Role,
	})
}

// POST /api/v1/auth/change-password
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	var req service.ChangePasswordRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "geçersiz istek gövdesi")
		return
	}
	if err := h.svc.ChangePassword(r.Context(), claims.UserID, req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respond(w, http.StatusOK, map[string]string{"message": "şifre güncellendi"})
}
