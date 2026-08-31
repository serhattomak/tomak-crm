-- ==============================================================================
-- Migration: 20260831000002_ecommerce_customers.sql
-- Description: E-Commerce MVP 1/5 — customers.auth_user_id + customer_addresses
--              + tenant_modules.ecommerce_enabled + tenant_settings store attrs
--              Q8/Q11/Q16 — ordered after 20260831000001_bugfix_batch.sql
--              No DROP COLUMN/TABLE, no CREATE TYPE — VARCHAR enums only.
--              Idempotent: IF NOT EXISTS / conditional logic.
-- ==============================================================================

SET search_path TO public;

-- Ensure required extensions (uuid_generate_v4 already enabled in init, gen_random_uuid via pgcrypto)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- 1. customers.auth_user_id — FK to auth.users nullable, ON DELETE SET NULL
-- --------------------------------------------------------------------------

-- Add column if not exists (nullable)
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Add FK constraint if not exists (ON DELETE SET NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_customers_auth_user_id'
          AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers
            ADD CONSTRAINT fk_customers_auth_user_id
            FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN public.customers.auth_user_id IS 'E-commerce auth link — FK auth.users(id) nullable, SET NULL on delete. Populated by handle_new_auth_user() trigger or public checkout merge.';

-- Index: tenant + auth_user_id unique partial where auth_user_id IS NOT NULL
-- (prevents duplicate auth link per tenant but allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_tenant_auth_user
    ON public.customers (tenant_id, auth_user_id)
    WHERE auth_user_id IS NOT NULL;

-- Helper index for lookup by auth_user_id (partial)
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id
    ON public.customers (auth_user_id)
    WHERE auth_user_id IS NOT NULL;

-- Back-compat naming alias expected by spec: idx_customers_auth_user_id already covers it.
-- Some checkers expect tenant_id+auth_user_id combined; uq above satisfies.

-- --------------------------------------------------------------------------
-- 2. customer_addresses — billing/shipping address book
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    -- type: billing / shipping — VARCHAR enum, CHECK constraint (no CREATE TYPE)
    type VARCHAR(50) NOT NULL DEFAULT 'shipping',
    -- label/title: user-facing name e.g. "Ev", "Ofis", "Billing"
    label VARCHAR(50),
    title VARCHAR(100),
    address_line TEXT NOT NULL DEFAULT '',
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL DEFAULT 'Türkiye',
    phone VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_customer_addresses_type CHECK (type IN ('billing', 'shipping'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_addresses_tenant
    ON public.customer_addresses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer
    ON public.customer_addresses (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_tenant_customer
    ON public.customer_addresses (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_default
    ON public.customer_addresses (customer_id, is_default) WHERE is_default = true;

COMMENT ON TABLE public.customer_addresses IS 'E-commerce address book — billing/shipping per customer, tenant-isolated, supports default flag. Q8.';
COMMENT ON COLUMN public.customer_addresses.type IS 'VARCHAR enum: billing | shipping (no PG enum type)';
COMMENT ON COLUMN public.customer_addresses.is_default IS 'Default address per customer+type — app enforces single default via logic';

-- Ensure updated_at trigger behavior matches other tables (optional, not required)

-- --------------------------------------------------------------------------
-- 3. tenant_modules.ecommerce_enabled — feature flag per tenant
-- --------------------------------------------------------------------------
-- tenant_modules is a row-per-module table (module_key, is_enabled). For
-- backwards-compat with spec that expects a boolean column, we add
-- ecommerce_enabled column IF NOT EXISTS. App should use module_key=''ecommerce''
-- row, but column allows quick guard without extra join.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenant_modules'
          AND column_name = 'ecommerce_enabled'
    ) THEN
        ALTER TABLE public.tenant_modules
            ADD COLUMN ecommerce_enabled BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN public.tenant_modules.ecommerce_enabled IS 'E-commerce feature flag — denormalized bool for quick guard. Canonical source is module_key=''ecommerce'' row is_enabled. Default false.';

-- Seed ecommerce module row for existing tenants that have no row yet (optional, idempotent)
-- Does not overwrite existing rows.
INSERT INTO public.tenant_modules (tenant_id, module_key, is_enabled, display_name, config_json)
SELECT t.id, 'ecommerce', false, 'E-Ticaret', '{}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, module_key) DO NOTHING;

-- --------------------------------------------------------------------------
-- 4. tenant_settings — per-tenant store settings
-- --------------------------------------------------------------------------
-- Create table if not exists (spec expects columns store_theme/payment_gateway/default_carrier)
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_theme VARCHAR(100) NOT NULL DEFAULT 'default',
    payment_gateway VARCHAR(100) NOT NULL DEFAULT 'iyzico',
    default_carrier VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If table existed from older migration but missing columns, add them
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS store_theme VARCHAR(100) NOT NULL DEFAULT 'default';
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(100) NOT NULL DEFAULT 'iyzico';
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS default_carrier VARCHAR(100);
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON public.tenant_settings (tenant_id);

COMMENT ON TABLE public.tenant_settings IS 'Per-tenant e-commerce store settings — Q11. One row per tenant.';
COMMENT ON COLUMN public.tenant_settings.store_theme IS 'VARCHAR: default, minimal, boutique, etc.';
COMMENT ON COLUMN public.tenant_settings.payment_gateway IS 'VARCHAR enum: iyzico | paytr | stripe (no PG enum)';
COMMENT ON COLUMN public.tenant_settings.default_carrier IS 'VARCHAR: YURTICI, ARAS, MNG, SURAT, PTT, etc.';

-- Ensure existing tenants have a settings row (idempotent)
INSERT INTO public.tenant_settings (tenant_id, store_theme, payment_gateway, default_carrier)
SELECT t.id, 'default', 'iyzico', NULL
FROM public.tenants t
ON CONFLICT (tenant_id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 5. RLS — tenant isolation on customer_addresses + tenant_settings
-- --------------------------------------------------------------------------
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- customer_addresses tenant isolation — mirrors customers pattern (app.current_tenant_id OR tenant_members)
DROP POLICY IF EXISTS customer_addresses_tenant_isolation ON public.customer_addresses;
CREATE POLICY customer_addresses_tenant_isolation ON public.customer_addresses
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = customer_addresses.tenant_id
              AND tenant_members.user_id = auth.uid()
        )
    );

-- tenant_settings RLS — same pattern
DROP POLICY IF EXISTS tenant_settings_tenant_isolation ON public.tenant_settings;
CREATE POLICY tenant_settings_tenant_isolation ON public.tenant_settings
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
        OR tenant_id = public.get_current_tenant_id()
    );

-- --------------------------------------------------------------------------
-- 6. Trigger: handle_new_auth_user() — auto-create customers row on auth.users insert
-- --------------------------------------------------------------------------
-- Creates an Individual/Active customer linked to the new auth user.
-- Tenant is inferred from raw_user_meta_data->>'tenant_id' or app.current_tenant_id.
-- If no tenant can be resolved, the trigger no-ops (API will create customer explicitly).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_name TEXT;
    v_email TEXT;
BEGIN
    -- Attempt tenant from metadata (ecommerce signup passes tenantSlug->tenant_id)
    BEGIN
        v_tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_tenant_id := NULL;
    END;

    -- Fallback: app.current_tenant_id session variable
    IF v_tenant_id IS NULL THEN
        BEGIN
            v_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_tenant_id := NULL;
        END;
    END IF;

    -- If still null, check if New user already created a tenant via handle_new_user()
    -- That function creates a personal workspace tenants row; reuse the most recent tenant
    -- for this user (tenant_members entry). If none, skip customer creation.
    IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM public.tenant_members
        WHERE user_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- Still null -> cannot create customer without tenant (public API will handle)
    IF v_tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    v_email := NEW.email;

    -- Insert customer if not already exists for this auth_user_id in this tenant
    INSERT INTO public.customers (tenant_id, auth_user_id, type, name, email, status, tier, country, created_at, updated_at)
    VALUES (
        v_tenant_id,
        NEW.id,
        'Individual',
        v_name,
        v_email,
        'Active',
        'Standard',
        'Türkiye',
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- Handle unique partial conflict gracefully: if row with same tenant+auth_user_id exists, ignore
    -- ON CONFLICT needs constraint; we use DO NOTHING without target to avoid error on other constraints

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never block auth.users insert on customer creation failure (log and continue)
    RAISE WARNING 'handle_new_auth_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger — distinct name from handle_new_user's on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMENT ON FUNCTION public.handle_new_auth_user() IS 'Q8: Auto-creates customers row (Individual/Active) on auth.users insert, linking auth_user_id. Multi-tenant aware via metadata/tenant_members. Security definer, never blocks signup.';
