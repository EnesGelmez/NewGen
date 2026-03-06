package handler

import (
	"net/http"
	"strings"

	ngapi "github.com/nexus/backend/api"
)

// SwaggerHandler serves:
//
//	GET /swagger/          â†’ Swagger UI HTML (CDN-hosted assets)
//	GET /swagger/openapi.yaml â†’ raw OpenAPI 3.0 spec
type SwaggerHandler struct{}

func NewSwaggerHandler() *SwaggerHandler { return &SwaggerHandler{} }

// ServeHTTP dispatches between the UI and the raw spec.
func (h *SwaggerHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	switch {
	case strings.HasSuffix(path, "/openapi.yaml"):
		h.serveSpec(w, r)
	default:
		h.serveUI(w, r)
	}
}

// serveSpec returns the embedded openapi.yaml file.
func (h *SwaggerHandler) serveSpec(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(ngapi.Spec) //nolint:errcheck
}

// serveUI returns the Swagger UI HTML page that loads the spec from the same origin.
func (h *SwaggerHandler) serveUI(w http.ResponseWriter, r *http.Request) {
	// Detect the base URL so the spec URL works correctly behind a reverse proxy.
	scheme := "http"
	if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	host := r.Host
	specURL := scheme + "://" + host + "/swagger/openapi.yaml"

	html := `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus API – Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { background: #1a1a2e !important; }
    .topbar-wrapper .link { display: none; }
    .swagger-ui .info .title { color: #1a1a2e; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: "` + specURL + `",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(html)) //nolint:errcheck
}
