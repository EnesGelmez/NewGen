package handler

import (
	"net/http"
	"strconv"

	"github.com/newgen/backend/internal/service"
)

// WorkflowHandler serves /api/v1/workflows.
type WorkflowHandler struct {
	svc *service.WorkflowService
}

func NewWorkflowHandler(svc *service.WorkflowService) *WorkflowHandler {
	return &WorkflowHandler{svc: svc}
}

// GET /api/v1/workflows
func (h *WorkflowHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	workflows, err := h.svc.List(r.Context(), claims.TenantID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, workflows)
}

// GET /api/v1/workflows/{id}
func (h *WorkflowHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	wf, err := h.svc.Get(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, wf)
}

// POST /api/v1/workflows
func (h *WorkflowHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	var req service.SaveWorkflowRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	wf, err := h.svc.Create(r.Context(), claims.TenantID, req)
	if err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	respond(w, http.StatusCreated, wf)
}

// PUT /api/v1/workflows/{id}
func (h *WorkflowHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req service.SaveWorkflowRequest
	if err := decode(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	wf, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	respond(w, http.StatusOK, wf)
}

// PATCH /api/v1/workflows/{id}/enable
func (h *WorkflowHandler) Enable(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	wf, err := h.svc.SetEnabled(r.Context(), id, true)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, wf)
}

// PATCH /api/v1/workflows/{id}/disable
func (h *WorkflowHandler) Disable(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	wf, err := h.svc.SetEnabled(r.Context(), id, false)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respond(w, http.StatusOK, wf)
}

// DELETE /api/v1/workflows/{id}
func (h *WorkflowHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/workflows/{id}/runs
func (h *WorkflowHandler) Runs(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	runs, err := h.svc.GetRuns(r.Context(), id, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, runs)
}

// POST /api/v1/workflows/{id}/trigger
// Manually trigger a workflow run.
//
// The service scans the workflow's nodes:
//   - If a "custom_cari_check" node is present → agentModel.cariKontrolEdilecekMi = true
//   - Otherwise → false
//
// The built agentModel is returned in the response so callers can inspect what
// would be forwarded to the on-premise Agent.
func (h *WorkflowHandler) Trigger(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	id := r.PathValue("id")
	var payload map[string]interface{}
	_ = decode(r, &payload)
	if payload == nil {
		payload = map[string]interface{}{}
	}
	result, err := h.svc.Trigger(r.Context(), id, claims.TenantID, payload)
	if err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	respond(w, http.StatusAccepted, map[string]interface{}{
		"runId":      result.Run.ID,
		"status":     result.Run.Status,
		"workflowId": id,
		"agentModel": result.AgentModel,
	})
}

// POST /api/v1/webhooks/{workflowId}
// Public webhook endpoint for external systems – authenticated via X-API-Key header.
// Triggers the given workflow with the provided JSON payload.
// Field mappings defined in "transform_mapping" nodes are applied automatically.
//
//	Request:  POST /api/v1/webhooks/{workflowId}
//	          X-API-Key: <tenant api key>
//	          Body: { "cariKodu": "ABC123" }
//
//	Response: { "runId": "...", "status": "SUCCESS", "data": { ... } }
func (h *WorkflowHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	workflowID := r.PathValue("workflowId")

	var payload map[string]interface{}
	_ = decode(r, &payload)
	if payload == nil {
		payload = map[string]interface{}{}
	}

	result, err := h.svc.Trigger(r.Context(), workflowID, claims.TenantID, payload)
	if err != nil {
		status := http.StatusUnprocessableEntity
		if err.Error() == "workflow is disabled" {
			status = http.StatusConflict
		}
		respondError(w, status, err.Error())
		return
	}
	respond(w, http.StatusOK, map[string]interface{}{
		"runId":  result.Run.ID,
		"status": result.Run.Status,
		"data":   result.AgentModel,
	})
}
