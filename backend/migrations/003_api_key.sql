-- =============================================================================
-- Migration 003: Add per-tenant API key for incoming webhook authentication
-- =============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_key TEXT NOT NULL DEFAULT '';

-- Backfill existing tenants with a generated key
UPDATE tenants
SET    api_key = 'ngk-' || gen_random_uuid()::text
WHERE  api_key = '';
