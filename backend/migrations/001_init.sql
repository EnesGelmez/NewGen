-- =============================================================================
-- NewGen Platform – PostgreSQL Schema
-- File: migrations/001_init.sql
-- Run automatically by Docker on first container start.
-- =============================================================================

-- Enable UUID generation (Postgres 13+: gen_random_uuid() is built-in)
-- For older versions you can enable: CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TENANTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        TEXT        NOT NULL,
    subdomain   TEXT        NOT NULL UNIQUE,
    email       TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'ACTIVE',
    plan        TEXT        NOT NULL DEFAULT 'Starter',
    agent_token TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id     TEXT        REFERENCES tenants(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'VIEWER',
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- WORKFLOWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS workflows (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id   TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    status      TEXT        NOT NULL DEFAULT 'ACTIVE',
    trigger     TEXT        NOT NULL DEFAULT '',
    nodes       JSONB       NOT NULL DEFAULT '[]',
    edges       JSONB       NOT NULL DEFAULT '[]',
    stats       JSONB       NOT NULL DEFAULT '{"totalRuns":0,"successRuns":0,"failedRuns":0,"avgDurationMs":0,"lastDayRuns":0,"lastDaySuccess":0,"lastDayFailed":0,"trend":"neutral"}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_run_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON workflows(tenant_id);

-- =============================================================================
-- WORKFLOW_RUNS
-- =============================================================================
CREATE TABLE IF NOT EXISTS workflow_runs (
    id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workflow_id TEXT        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id   TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'RUNNING',
    duration_ms BIGINT      NOT NULL DEFAULT 0,
    payload     JSONB,
    result      JSONB,
    error_msg   TEXT        NOT NULL DEFAULT '',
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_runs_tenant   ON workflow_runs(tenant_id);

-- =============================================================================
-- API_ENDPOINTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_endpoints (
    id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id      TEXT        NOT NULL,
    name           TEXT        NOT NULL,
    slug           TEXT        NOT NULL,
    method         TEXT        NOT NULL DEFAULT 'POST',
    path           TEXT        NOT NULL DEFAULT '',
    description    TEXT        NOT NULL DEFAULT '',
    enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    auth           TEXT        NOT NULL DEFAULT 'NONE',
    category       TEXT        NOT NULL DEFAULT '',
    parameters     JSONB       NOT NULL DEFAULT '[]',
    response       JSONB       NOT NULL DEFAULT '{"type":"object","example":"{}"}',
    test_mode      BOOLEAN     NOT NULL DEFAULT FALSE,
    call_count     BIGINT      NOT NULL DEFAULT 0,
    last_called_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_endpoints_tenant ON api_endpoints(tenant_id);

-- =============================================================================
-- AGENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
    id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id      TEXT        NOT NULL UNIQUE,
    version        TEXT        NOT NULL DEFAULT '',
    hostname       TEXT        NOT NULL DEFAULT '',
    status         TEXT        NOT NULL DEFAULT 'OFFLINE',
    last_heartbeat TIMESTAMPTZ,
    registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Tenants
INSERT INTO tenants (id, name, subdomain, email, status, plan, agent_token)
VALUES
    ('tenant-001', 'Arçelik Pazarlama A.Ş.', 'arcelik', 'entegrasyon@arcelik.com', 'ACTIVE',    'Enterprise', 'agent-secret-arcelik-001'),
    ('tenant-002', 'Beko Elektronik A.Ş.',   'beko',    'it@beko.com',              'TRIAL',     'Starter',    'agent-secret-beko-002')
ON CONFLICT (id) DO NOTHING;

-- Super-admin user  (password: admin123)
INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active)
VALUES
    ('user-super-001', NULL, 'Super Admin', 'admin@nexus.dev',
     '$2a$10$Ow.YEo17kozKkhRBqwt66.erzprXjunto.VYkYif0a9tWWEf5WvO6',
     'SUPER_ADMIN', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Tenant-admin users  (password: admin123)
INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active)
VALUES
    ('user-tenant-001', 'tenant-001', 'Arçelik Admin', 'admin@arcelik.com',
     '$2a$10$Ow.YEo17kozKkhRBqwt66.erzprXjunto.VYkYif0a9tWWEf5WvO6',
     'TENANT_ADMIN', TRUE),
    ('user-tenant-002', 'tenant-002', 'Beko Admin', 'admin@beko.com',
     '$2a$10$Ow.YEo17kozKkhRBqwt66.erzprXjunto.VYkYif0a9tWWEf5WvO6',
     'TENANT_ADMIN', TRUE)
ON CONFLICT (id) DO NOTHING;

