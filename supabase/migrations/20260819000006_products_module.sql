-- ==============================================================================
-- MIGRATION: 20260819000006_products_module.sql
-- DESCRIPTION: Products, Product Categories, Variants & Stock Movement Ledger
-- ==============================================================================

-- 1. PRODUCT CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON public.product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON public.product_categories(tenant_id, slug);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Physical', -- 'Physical', 'Service', 'Digital', 'Subscription'
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    brand VARCHAR(150),
    unit VARCHAR(50) NOT NULL DEFAULT 'Adet', -- 'Adet', 'Saat', 'Ay', 'Yıl', 'Kg', 'Paket', 'Kutu', 'Litre'
    cost_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00, -- %0, %1, %10, %20
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    track_inventory BOOLEAN NOT NULL DEFAULT true,
    current_stock NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    reserved_stock NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    min_stock_level NUMERIC(18, 2) NOT NULL DEFAULT 5.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive', 'Draft', 'Discontinued'
    images TEXT[],
    tags TEXT[],
    attributes JSONB,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(tenant_id, status);

-- 3. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- Örn: 'Kırmızı - L', '128 GB - Uzay Grisi'
    sku VARCHAR(100),
    barcode VARCHAR(100),
    additional_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    stock_quantity NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    attributes JSONB, -- { "color": "Red", "size": "L" }
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_tenant ON public.product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(tenant_id, sku);

-- 4. PRODUCT STOCK MOVEMENTS TABLE (LEDGER)
CREATE TABLE IF NOT EXISTS public.product_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'In' (Giriş), 'Out' (Çıkış/Satış), 'Adjustment' (Sayım Düzeltme), 'Return' (İade)
    quantity NUMERIC(18, 2) NOT NULL,
    previous_stock NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    new_stock NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(18, 2),
    reference_number VARCHAR(100), -- Fatura / İrsaliye / Sipariş No
    reason VARCHAR(255),
    notes TEXT,
    performed_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON public.product_stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.product_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.product_stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.product_stock_movements(created_at DESC);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_categories_tenant_isolation ON public.product_categories;
CREATE POLICY product_categories_tenant_isolation ON public.product_categories
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.product_categories.tenant_id
            AND tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS products_tenant_isolation ON public.products;
CREATE POLICY products_tenant_isolation ON public.products
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.products.tenant_id
            AND tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS product_variants_tenant_isolation ON public.product_variants;
CREATE POLICY product_variants_tenant_isolation ON public.product_variants
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.product_variants.tenant_id
            AND tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS product_stock_movements_tenant_isolation ON public.product_stock_movements;
CREATE POLICY product_stock_movements_tenant_isolation ON public.product_stock_movements
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.product_stock_movements.tenant_id
            AND tm.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 6. PERMISSIONS SEED & ASSIGNMENT
-- ==============================================================================
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Products.View', 'Ürün ve Hizmetleri Görüntüle', 'Ürün, hizmet, kategori ve stok listesini görüntüleyebilir.', 'Products'),
    (gen_random_uuid(), 'Products.Create', 'Yeni Ürün/Hizmet Oluştur', 'Yeni ürün, hizmet, kategori ve varyant tanımlayabilir.', 'Products'),
    (gen_random_uuid(), 'Products.Update', 'Ürün/Hizmet Güncelle', 'Ürün ve hizmet detaylarını, fiyatlarını güncelleyebilir.', 'Products'),
    (gen_random_uuid(), 'Products.Delete', 'Ürün/Hizmet Sil', 'Ürün, kategori veya varyantları silebilir.', 'Products'),
    (gen_random_uuid(), 'Products.StockAdjust', 'Stok Hareketi / Sayım Düzeltme', 'Manuel stok girişi, çıkışı ve sayım düzeltmesi yapabilir.', 'Products')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to Owner, Admin and Super Admin roles across all tenants
DO $$
DECLARE
    r RECORD;
    p RECORD;
BEGIN
    FOR r IN SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin') LOOP
        FOR p IN SELECT id FROM public.permissions WHERE module = 'Products' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (r.id, p.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
