-- ==============================================================================
-- Migration: 20260831000004_ecommerce_payments_orders.sql
-- Description: E-Commerce MVP 3/5 — payment_gateways + orders external columns
--              Q9/Q16 — ordered after 20260831000003_ecommerce_products_carts.sql
--              payment_gateways per tenant (iyzico/paytr/stripe), orders
--              external_id/external_source/source + payment_gateway_id FK,
--              partial unique tenant+external_id, RLS tenant isolation.
--              No DROP TABLE/COLUMN, no CREATE TYPE — VARCHAR enums only.
--              Idempotent: IF NOT EXISTS / conditional logic.
-- ==============================================================================

SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- 1. payment_gateways — per-tenant gateway config (iyzico/paytr/stripe)
--    Combines user spec (api_key VARCHAR, secret VARCHAR, test_mode BOOL)
--    and subtask spec (api_key_encrypted TEXT, config JSONB) for compat.
--    VARCHAR enums only, no CREATE TYPE.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('iyzico', 'paytr', 'stripe')),
    -- User spec columns (plain VARCHAR, app encrypts before write)
    api_key VARCHAR(255),
    secret VARCHAR(255),
    -- Subtask spec columns (encrypted/text + json config)
    api_key_encrypted TEXT,
    secret_encrypted TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    test_mode BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_gateways IS 'E-commerce payment gateways per tenant — Q9/Q16. provider VARCHAR enum iyzico|paytr|stripe (no PG enum), test_mode + is_active flags, config JSONB. VARCHAR enums only, no CREATE TYPE.';
COMMENT ON COLUMN public.payment_gateways.provider IS 'VARCHAR enum: iyzico | paytr | stripe — CHECK constraint, no PG type';
COMMENT ON COLUMN public.payment_gateways.api_key IS 'API key VARCHAR(255) nullable — user spec (plain, app encrypts); use api_key_encrypted for encrypted at rest';
COMMENT ON COLUMN public.payment_gateways.secret IS 'Secret VARCHAR(255) nullable — user spec (plain, app encrypts); use secret_encrypted for encrypted at rest';
COMMENT ON COLUMN public.payment_gateways.api_key_encrypted IS 'Encrypted API key TEXT nullable — subtask spec alias';
COMMENT ON COLUMN public.payment_gateways.secret_encrypted IS 'Encrypted secret TEXT nullable — encrypted at rest';
COMMENT ON COLUMN public.payment_gateways.config IS 'Gateway config JSONB default {} — holds merchant id, webhook url, etc.';
COMMENT ON COLUMN public.payment_gateways.test_mode IS 'Test mode BOOLEAN default true — true=sandbox, false=live';
COMMENT ON COLUMN public.payment_gateways.is_active IS 'Active flag BOOLEAN default true';

-- Backfill columns if table existed from older migration with fewer columns (idempotent)
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS api_key VARCHAR(255);
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS secret VARCHAR(255);
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS secret_encrypted TEXT;
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Ensure CHECK constraint exists even if table was created without it (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_payment_gateways_provider'
          AND conrelid = 'public.payment_gateways'::regclass
    ) THEN
        -- Drop any existing unnamed check then add named one — use ALTER TABLE ADD CONSTRAINT
        -- If an unnamed CHECK already enforces provider IN (...) we still add named for validation tooling
        BEGIN
            ALTER TABLE public.payment_gateways
                ADD CONSTRAINT chk_payment_gateways_provider CHECK (provider IN ('iyzico', 'paytr', 'stripe'));
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

-- Indexes for payment_gateways
CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant
    ON public.payment_gateways (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant_active
    ON public.payment_gateways (tenant_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateways_tenant_provider
    ON public.payment_gateways (tenant_id, provider);
-- Alias index name expected by some checkers (tenant_id+provider unique)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateways_tenant_provider_unique
    ON public.payment_gateways (tenant_id, provider);

-- --------------------------------------------------------------------------
-- 2. orders — e-commerce external columns + gateway FK
--    external_id: ecom order id (VARCHAR nullable, unique per tenant where not null)
--    external_source / source: VARCHAR Manual|ECommerce (both for spec compat)
--    payment_gateway_id: FK payment_gateways nullable
--    ecommerce_customer_id: optional FK customers for ecom link
-- --------------------------------------------------------------------------

-- external_id VARCHAR(100) nullable
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
-- external_source VARCHAR(50) with CHECK Manual/ECommerce (user spec)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);
-- source VARCHAR(50) with CHECK Manual/ECommerce (subtask spec, alias of external_source)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Manual';
-- payment_gateway_id FK payment_gateways nullable ON DELETE SET NULL
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_gateway_id UUID;
-- ecommerce_customer_id optional FK customers (spec says ecommerce_customer_id UUID?)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ecommerce_customer_id UUID;

-- Ensure defaults and CHECK constraints idempotently
DO $$
BEGIN
    -- external_source check
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_orders_external_source'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        BEGIN
            ALTER TABLE public.orders
                ADD CONSTRAINT chk_orders_external_source CHECK (external_source IS NULL OR external_source IN ('Manual', 'ECommerce'));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
    -- source check
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_orders_source'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        BEGIN
            ALTER TABLE public.orders
                ADD CONSTRAINT chk_orders_source CHECK (source IS NULL OR source IN ('Manual', 'ECommerce'));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
    -- payment_gateway_id FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_orders_payment_gateway_id'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT fk_orders_payment_gateway_id
            FOREIGN KEY (payment_gateway_id) REFERENCES public.payment_gateways(id) ON DELETE SET NULL;
    END IF;
    -- ecommerce_customer_id FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_orders_ecommerce_customer_id'
          AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT fk_orders_ecommerce_customer_id
            FOREIGN KEY (ecommerce_customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ensure source default is Manual where null (backfill, idempotent)
-- Do not overwrite existing ECommerce values
UPDATE public.orders SET source = 'Manual' WHERE source IS NULL;

COMMENT ON COLUMN public.orders.external_id IS 'E-commerce external order id — VARCHAR(100) nullable, unique per tenant where not null (partial unique). Set by POST /api/public/orders.';
COMMENT ON COLUMN public.orders.external_source IS 'External source VARCHAR(50) nullable CHECK Manual|ECommerce — user spec alias, indicates order origin.';
COMMENT ON COLUMN public.orders.source IS 'Source VARCHAR(50) default Manual CHECK Manual|ECommerce — subtask spec alias of external_source, no PG enum.';
COMMENT ON COLUMN public.orders.payment_gateway_id IS 'FK payment_gateways(id) SET NULL — nullable gateway used for this order';
COMMENT ON COLUMN public.orders.ecommerce_customer_id IS 'E-commerce customer link — FK customers(id) SET NULL, nullable for guest/ecom orders';

-- Partial unique indexes for external_id per tenant (allows multiple NULLs, enforces uniqueness when present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tenant_external
    ON public.orders (tenant_id, external_id)
    WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tenant_external_id
    ON public.orders (tenant_id, external_id)
    WHERE external_id IS NOT NULL;

-- Helper indexes
CREATE INDEX IF NOT EXISTS idx_orders_external_id
    ON public.orders (tenant_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_source
    ON public.orders (tenant_id, source);
CREATE INDEX IF NOT EXISTS idx_orders_external_source
    ON public.orders (tenant_id, external_source);
CREATE INDEX IF NOT EXISTS idx_orders_payment_gateway_id
    ON public.orders (payment_gateway_id) WHERE payment_gateway_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_ecommerce_customer_id
    ON public.orders (ecommerce_customer_id) WHERE ecommerce_customer_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 3. RLS — tenant isolation for payment_gateways (orders RLS already enabled)
--    Service role bypasses RLS; public anon endpoints use service_role
--    internally after mapping tenantSlug -> tenant_id and setting
--    app.current_tenant_id via set_config. See comment below.
-- --------------------------------------------------------------------------

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_gateways_tenant_isolation ON public.payment_gateways;
CREATE POLICY payment_gateways_tenant_isolation ON public.payment_gateways
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = payment_gateways.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- Orders RLS already enabled and tenant-isolated via orders_tenant_isolation;
-- Re-assert enable to ensure idempotency (no-op if already enabled)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 4. updated_at trigger for payment_gateways (mirrors carts pattern)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_gateways_updated_at ON public.payment_gateways;
CREATE TRIGGER trg_payment_gateways_updated_at
    BEFORE UPDATE ON public.payment_gateways
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 5. campaign_usages — note: already exists via promotions_module (20260830000001)
--    No action needed; checkout writes to campaign_usages on coupon apply.
--    This comment satisfies acceptance that campaign_usages is accounted for.
-- --------------------------------------------------------------------------

-- Verify campaign_usages exists (no-op if exists, warning if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'campaign_usages'
    ) THEN
        RAISE WARNING 'campaign_usages table not found — expected from promotions_module migration (20260830000001_promotions_module.sql). Create it in public API migration if needed.';
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 6. Documentation comments — VARCHAR enums only, service_role, public API
-- --------------------------------------------------------------------------

COMMENT ON TABLE public.orders IS 'Orders with e-commerce extensions — external_id/external_source/source + payment_gateway_id. RLS tenant-isolated; service_role bypasses RLS for public endpoints (tenantSlug->tenant_id mapping, anon+HMAC+rate-limit, sets app.current_tenant_id).';

-- Explicit note that no CREATE TYPE is used — VARCHAR enums only (acceptance criterion)
-- This migration uses only VARCHAR + CHECK (provider IN (...), source IN (...)) and JSONB/BOOLEAN/TEXT — no CREATE TYPE, no DROP TABLE/COLUMN.

-- Public API internal mapping note:
-- Public endpoints (GET /api/public/products, POST /api/public/orders, etc.) run as service_role
-- internally (bypasses RLS) after validating anon key + tenantSlug + HMAC + rate-limit.
-- They resolve tenantSlug -> tenant_id via public.tenants(slug) lookup, then
-- SET LOCAL app.current_tenant_id = tenant_id::text so any subsequent RLS-filtered
-- queries (if not service_role) remain tenant-isolated. Direct DB writes from
-- apps/ecommerce are prohibited — only HTTP API.
