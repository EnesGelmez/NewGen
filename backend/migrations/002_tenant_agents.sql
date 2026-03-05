-- =============================================================================
-- NewGen Platform – Tenant Agent Configuration
-- File: migrations/002_tenant_agents.sql
-- Stores the outbound LOGO ERP API configuration per tenant.
-- Applied manually after initial setup: psql -f 002_tenant_agents.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_agents (
    id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id    TEXT        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL DEFAULT 'LOGO ERP Agent',
    endpoint_url TEXT        NOT NULL,
    secret_key   TEXT        NOT NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
