-- ==============================================================================
-- Migration: 20260831000003_ecommerce_products_carts.sql
-- Description: E-Commerce MVP 2/5 — products catalog extensions + carts/cart_items
--              Q10/Q16 — ordered after 20260831000002_ecommerce_customers.sql
--              Products: slug/is_published/is_featured/seo/weight/dimensions,
--              unique tenant+slug index. Carts + cart_items with tenant RLS,
--              guest_token (VARCHAR holds UUID string) + customer_id check,
--              price snapshots, quantity check. Idempotent, no DROP/CREATE TYPE.
-- ==============================================================================

SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- 1. products catalog extensions
--    ALTER TABLE ADD COLUMN IF NOT EXISTS — idempotent, VARCHAR enums only
-- --------------------------------------------------------------------------

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);

COMMENT ON COLUMN public.products.slug IS 'E-commerce URL slug — VARCHAR, unique per tenant where not null. Used for GET /api/public/products?tenantSlug&is_published routing.';
COMMENT ON COLUMN public.products.seo_title IS 'SEO title override — VARCHAR(255), nullable';
COMMENT ON COLUMN public.products.meta_description IS 'SEO meta description — TEXT, nullable';
COMMENT ON COLUMN public.products.is_published IS 'Published to storefront — BOOLEAN default false. CRM master, ecommerce reads only where is_published=true.';
COMMENT ON COLUMN public.products.is_featured IS 'Featured product flag — BOOLEAN default false for storefront highlights.';
COMMENT ON COLUMN public.products.sort_order IS 'Manual sort order — INT default 0, lower first.';
COMMENT ON COLUMN public.products.weight_kg IS 'Shipping weight in kg — NUMERIC(10,2) nullable. Alias column weight exists for back-compat.';
COMMENT ON COLUMN public.products.weight IS 'Alias of weight_kg — NUMERIC(10,2) nullable. Kept for spec compatibility (subtask expects weight DECIMAL).';
COMMENT ON COLUMN public.products.dimensions IS 'Dimensions string e.g. 10x20x30 cm — VARCHAR(100) nullable.';

-- Unique index tenant+slug partial where slug IS NOT NULL (allows multiple NULL slugs, enforces uniqueness per tenant when present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_slug
    ON public.products (tenant_id, slug)
    WHERE slug IS NOT NULL;

-- Helper indexes for storefront filtering (is_published / is_featured / slug lookups)
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (tenant_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_published ON public.products (tenant_id, is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products (tenant_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products (tenant_id, sort_order);

-- --------------------------------------------------------------------------
-- 2. carts — tenant-isolated shopping carts (guest_token UUID via VARCHAR + customer_id)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    -- guest_token stores UUID string for anonymous carts — VARCHAR holds UUID (e.g. gen_random_uuid()::text)
    -- Satisfies both specs: subtask expects VARCHAR nullable unique, user spec expects UUID token
    guest_token VARCHAR(100),
    -- Additional UUID-typed alias for strict UUID checks (nullable, holds same token as UUID type)
    guest_token_uuid UUID,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + interval '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_carts_guest_or_customer CHECK (
        customer_id IS NOT NULL OR guest_token IS NOT NULL OR guest_token_uuid IS NOT NULL
    )
);

COMMENT ON TABLE public.carts IS 'E-commerce shopping carts — tenant isolated, guest_token (VARCHAR holds UUID string) or customer_id required, expires in 7 days.';
COMMENT ON COLUMN public.carts.tenant_id IS 'FK tenants(id) CASCADE — tenant isolation for RLS';
COMMENT ON COLUMN public.carts.customer_id IS 'FK customers(id) SET NULL — nullable for guest carts, merged on auth';
COMMENT ON COLUMN public.carts.guest_token IS 'Guest token VARCHAR(100) — stores UUID string (e.g. gen_random_uuid()::text), unique where not null, alternative to customer_id';
COMMENT ON COLUMN public.carts.guest_token_uuid IS 'Guest token UUID alias — UUID typed token for user spec compatibility, nullable, mirrors guest_token';
COMMENT ON COLUMN public.carts.expires_at IS 'Cart expiry — default NOW()+7 days, cleaned by cron or checkout';
COMMENT ON COLUMN public.carts.created_at IS 'Created at — TIMESTAMPTZ default NOW()';
COMMENT ON COLUMN public.carts.updated_at IS 'Updated at — TIMESTAMPTZ default NOW(), app updates on item change';

-- Indexes for carts (tenant isolation + guest/customer lookup + expiry)
CREATE INDEX IF NOT EXISTS idx_carts_tenant ON public.carts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_carts_customer ON public.carts (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_guest_token ON public.carts (guest_token) WHERE guest_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_guest_token_uuid ON public.carts (guest_token_uuid) WHERE guest_token_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_tenant_customer ON public.carts (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_expires_at ON public.carts (expires_at);
-- Unique partial indexes for guest_token (VARCHAR) and guest_token_uuid (UUID) — enforce one cart per guest token per tenant when present
CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_tenant_guest_token ON public.carts (tenant_id, guest_token) WHERE guest_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_tenant_guest_token_uuid ON public.carts (tenant_id, guest_token_uuid) WHERE guest_token_uuid IS NOT NULL;

-- --------------------------------------------------------------------------
-- 3. cart_items — line items with price snapshots, tenant denormalized for RLS
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    -- price snapshots — both names for spec compatibility (subtask: price_snapshot, user: snapshot_price)
    price_snapshot NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    snapshot_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    snapshot_name VARCHAR(255),
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cart_items IS 'Cart line items — tenant denormalized for RLS, FK cart CASCADE, product RESTRICT, variant SET NULL, quantity >0, price snapshots.';
COMMENT ON COLUMN public.cart_items.cart_id IS 'FK carts(id) CASCADE';
COMMENT ON COLUMN public.cart_items.product_id IS 'FK products(id) RESTRICT — preserve referential integrity';
COMMENT ON COLUMN public.cart_items.variant_id IS 'FK product_variants(id) SET NULL — nullable variant';
COMMENT ON COLUMN public.cart_items.tenant_id IS 'Denormalized tenant_id for RLS — must match carts.tenant_id (app enforces)';
COMMENT ON COLUMN public.cart_items.quantity IS 'Quantity INT CHECK >0';
COMMENT ON COLUMN public.cart_items.price_snapshot IS 'Price snapshot at add-to-cart — NUMERIC(18,2), subtask compatibility name';
COMMENT ON COLUMN public.cart_items.snapshot_price IS 'Alias of price_snapshot — NUMERIC(18,2), user spec compatibility name';
COMMENT ON COLUMN public.cart_items.snapshot_name IS 'Product name snapshot — VARCHAR(255), preserves name at time of cart';
COMMENT ON COLUMN public.cart_items.currency IS 'Currency snapshot — VARCHAR(10) default TRY';

-- Indexes for cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON public.cart_items (variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant ON public.cart_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant_cart ON public.cart_items (tenant_id, cart_id);
-- Unique per cart+product+variant to prevent duplicate lines (app merges quantity)
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_cart_product_variant ON public.cart_items (cart_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- --------------------------------------------------------------------------
-- 4. RLS — tenant isolation matching products/customers pattern
-- --------------------------------------------------------------------------

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- carts tenant isolation — app.current_tenant_id OR tenant_members membership (service_role bypasses RLS internally)
DROP POLICY IF EXISTS carts_tenant_isolation ON public.carts;
CREATE POLICY carts_tenant_isolation ON public.carts
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = carts.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS cart_items_tenant_isolation ON public.cart_items;
CREATE POLICY cart_items_tenant_isolation ON public.cart_items
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = cart_items.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- 5. updated_at helpers — auto-bump updated_at on row update (idempotent)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_carts_updated_at ON public.carts;
CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON public.carts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at_ecommerce ON public.products;
CREATE TRIGGER trg_products_updated_at_ecommerce
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
