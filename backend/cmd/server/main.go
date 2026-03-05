package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/newgen/backend/internal/config"
	"github.com/newgen/backend/internal/domain"
	"github.com/newgen/backend/internal/handler"
	"github.com/newgen/backend/internal/middleware"
	memrepo "github.com/newgen/backend/internal/repository/memory"
	pgrepo "github.com/newgen/backend/internal/repository/postgres"
	"github.com/newgen/backend/internal/router"
	"github.com/newgen/backend/internal/service"
)

func main() {
	// ─── Logging ──────────────────────────────────────────────────────────────
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	// ─── Config ───────────────────────────────────────────────────────────────
	cfg := config.Load()

	// ─── Repositories ─────────────────────────────────────────────────────────
	// Connect to PostgreSQL when DATABASE_URL is set; fall back to in-memory.
	var (
		tenantRepo      domain.TenantRepository
		userRepo        domain.UserRepository
		workflowRepo    domain.WorkflowRepository
		runRepo         domain.WorkflowRunRepository
		endpointRepo    domain.ApiEndpointRepository
		agentRepo       domain.AgentRepository
		tenantAgentRepo domain.TenantAgentRepository
	)

	ctx := context.Background()

	if cfg.DatabaseURL != "" {
		db, err := pgrepo.New(ctx, cfg.DatabaseURL)
		if err != nil {
			log.Warn().Err(err).Msg("PostgreSQL unavailable – falling back to in-memory store")
			goto useMemory
		}
		log.Info().Str("db", cfg.DatabaseURL).Msg("connected to PostgreSQL")
		tenantRepo      = pgrepo.NewTenantRepo(db)
		userRepo        = pgrepo.NewUserRepo(db)
		workflowRepo    = pgrepo.NewWorkflowRepo(db)
		runRepo         = pgrepo.NewWorkflowRunRepo(db)
		endpointRepo    = pgrepo.NewApiEndpointRepo(db)
		agentRepo       = pgrepo.NewAgentRepo(db)
		tenantAgentRepo = pgrepo.NewTenantAgentRepo(db)
		goto startServer
	}

useMemory:
	log.Info().Msg("using in-memory repository store")
	tenantRepo      = memrepo.NewTenantRepo()
	userRepo        = memrepo.NewUserRepo()
	workflowRepo    = memrepo.NewWorkflowRepo()
	runRepo         = memrepo.NewWorkflowRunRepo()
	endpointRepo    = memrepo.NewApiEndpointRepo()
	agentRepo       = memrepo.NewAgentRepo()
	tenantAgentRepo = memrepo.NewTenantAgentRepo()

startServer:
	// ─── Services ─────────────────────────────────────────────────────────────
	jwtSvc          := service.NewJWTService(cfg.JWTSecret, cfg.JWTTTLHours)
	authSvc         := service.NewAuthService(userRepo, jwtSvc)
	tenantSvc       := service.NewTenantService(tenantRepo)
	tenantAgentSvc  := service.NewTenantAgentService(tenantAgentRepo)
	workflowSvc     := service.NewWorkflowService(workflowRepo, runRepo, tenantAgentRepo)
	endpointSvc     := service.NewApiEndpointService(endpointRepo)
	cariSvc         := service.NewCariKontrolService(endpointRepo, agentRepo)
	agentSvc        := service.NewAgentService(agentRepo)

	// ─── Handlers ─────────────────────────────────────────────────────────────
	authH         := handler.NewAuthHandler(authSvc)
	tenantH       := handler.NewTenantHandler(tenantSvc)
	tenantAgentH  := handler.NewTenantAgentHandler(tenantAgentSvc)
	workflowH     := handler.NewWorkflowHandler(workflowSvc)
	endpointH     := handler.NewApiEndpointHandler(endpointSvc)
	cariH         := handler.NewCariKontrolHandler(cariSvc)
	agentH        := handler.NewAgentHandler(agentSvc, cariSvc)

	// ─── Router ───────────────────────────────────────────────────────────────
	routes := router.New(jwtSvc, cfg.APIKeys,
		authH, tenantH, workflowH, endpointH, cariH, agentH, tenantAgentH)

	// ─── Root handler (CORS + Logger wrapping the router) ─────────────────────
	root := middleware.CORS(cfg.AllowedOrigins)(
		middleware.Logger(routes),
	)

	// ─── HTTP Server ──────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      root,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start in background
	go func() {
		log.Info().Str("addr", srv.Addr).
			Str("swagger", "http://localhost:"+cfg.Port+"/swagger/").
			Msg("NewGen backend started")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	// ─── Graceful shutdown ────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	log.Info().Msg("server stopped")
}
