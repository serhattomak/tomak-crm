-- ==============================================================================
-- MIGRATION: 20260904000002_suppliers_brands_module.sql
-- DESCRIPTION: F2-2 — Suppliers & Brands CRUD + products table FK columns
--              F2-4 — Products e-commerce columns (is_published, is_featured,
--                     sort_order, weight_kg, dimensions)
-- DEPENDS ON: 20260819000006_products_module.sql
-- ==============================================================================

-- 1. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(tenant_id, name);

-- 2. BRANDS TABLE
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    website VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_tenant ON public.brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_name ON public.brands(tenant_id, name);

-- 3. PRODUCTS TABLE — FK kolonlar + e-ticaret alanlari
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS supplier_id  UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS brand_id     UUID REFERENCES public.brands(id)    ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_featured  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS sort_order   INT     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weight_kg    NUMERIC(10, 3),
    ADD COLUMN IF NOT EXISTS dimensions   VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_products_supplier  ON public.products(supplier_id)  WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand     ON public.products(brand_id)     WHERE brand_id    IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(tenant_id, is_published);

-- 4. RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_tenant_isolation ON public.suppliers;
CREATE POLICY suppliers_tenant_isolation ON public.suppliers
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.suppliers.tenant_id
            AND tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS brands_tenant_isolation ON public.brands;
CREATE POLICY brands_tenant_isolation ON public.brands
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.brands.tenant_id
            AND tm.user_id = auth.uid()
        )
    );
