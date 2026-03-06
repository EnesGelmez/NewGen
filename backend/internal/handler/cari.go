package handler

import (
	"net/http"

	"github.com/nexus/backend/internal/domain"
	"github.com/nexus/backend/internal/service"
)

// CariKontrolHandler serves the Cari Kontrol endpoint exposed to external callers.
type CariKontrolHandler struct {
	svc *service.CariKontrolService
}

func NewCariKontrolHandler(svc *service.CariKontrolService) *CariKontrolHandler {
	return &CariKontrolHandler{svc: svc}
}

// POST /api/v1/cari-kontrol
//
// Request body: { "cariKod": "ARCE-001" }
// Response    : { "success": true, "cariKontrolEdilecekMi": true, "cariKod": "ARCE-001" }
//
// The cloud immediately returns the flag; the actual ERP lookup is delegated
// to the on-premise Agent via AgentHandler.Process below.
func (h *CariKontrolHandler) Check(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())

	var req domain.CariKontrolRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.svc.Check(r.Context(), claims.TenantID, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respond(w, http.StatusOK, resp)
}

// AgentHandler handles requests that originate from or go to the local Agent.
type AgentHandler struct {
	svc      *service.AgentService
	cariSvc  *service.CariKontrolService
}

func NewAgentHandler(svc *service.AgentService, cariSvc *service.CariKontrolService) *AgentHandler {
	return &AgentHandler{svc: svc, cariSvc: cariSvc}
}

// GET /api/v1/agent/status
func (h *AgentHandler) Status(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	agent, err := h.svc.GetStatus(r.Context(), claims.TenantID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, agent)
}

// POST /api/v1/agent/heartbeat
// Called by the on-premise Agent to signal it is alive.
//
// Request body: { "agentId": "agent-t1", "version": "1.4.2", "hostname": "ERP-PC-01" }
func (h *AgentHandler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	var body struct {
		AgentID  string `json:"agentId"`
		Version  string `json:"version"`
		Hostname string `json:"hostname"`
	}
	if err := decode(r, &body); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.Heartbeat(r.Context(), claims.TenantID, body.AgentID, body.Version, body.Hostname); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, map[string]string{"status": "ok"})
}

// POST /api/v1/agent/process
// Test endpoint that simulates the Agent processing a model sent from the cloud.
//
// Request body:
//
//	{
//	  "runId": "run-abc123",
//	  "model": {
//	    "cariKod": "ARCE-001",
//	    "cariKontrolEdilecekMi": true
//	  }
//	}
func (h *AgentHandler) Process(w http.ResponseWriter, r *http.Request) {
	var req domain.AgentProcessRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.svc.ProcessRequest(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, resp)
}
