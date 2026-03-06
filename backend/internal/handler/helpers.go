// Package handler contains HTTP handler types and shared helpers.
package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/nexus/backend/internal/middleware"
	"github.com/nexus/backend/internal/service"
)

// claimsFromContext is a convenience wrapper used by all handlers.
func claimsFromContext(ctx context.Context) *service.Claims {
	return middleware.ClaimsFromContext(ctx)
}

// respond serialises v as JSON and writes it to w with the given status code.
func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// respondError writes a JSON error envelope.
func respondError(w http.ResponseWriter, status int, msg string) {
	respond(w, status, map[string]string{"error": msg})
}

// decode deserialises the request body into dest.
func decode(r *http.Request, dest any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dest)
}

// buildTriggerResponse creates a clean, consistent response envelope for both
// the webhook and manual trigger endpoints.
//
// Success shape:
//
//	{
//	  "success": true,
//	  "runId": "...",
//	  "workflowId": "...",
//	  "status": "SUCCESS",
//	  "triggeredAt": "...",
//	  "durationMs": 245,
//	  "result": { ...agent response fields... }
//	}
//
// Failure shape adds:
//
//	  "error": "HTTP 400 â€“ ..."
func buildTriggerResponse(r *service.TriggerResult) map[string]interface{} {
	success := r.Run.Status == "SUCCESS"
	resp := map[string]interface{}{
		"success":     success,
		"runId":       r.Run.ID,
		"workflowId":  r.Run.WorkflowID,
		"triggeredAt": r.Run.StartedAt,
		"result":      r.Data,
	}
	if !success {
		if r.Run.ErrorMsg != "" {
			resp["error"] = r.Run.ErrorMsg
		}
		if body, ok := r.Meta["_agentErrorBody"]; ok {
			resp["agentError"] = body
		}
		if sent, ok := r.Meta["_agentSentBody"]; ok {
			resp["sentPayload"] = sent
		}
	}
	return resp
}
