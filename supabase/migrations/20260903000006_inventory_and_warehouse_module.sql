-- =====================================================
-- Inventory, Multi-Warehouse, Stock Transfers & Stock Counts Module Schema & RLS
-- Migration: 20260903000006_inventory_and_warehouse_module.sql
-- =====================================================

-- 1. Warehouses (Depo Tanımları)
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Central', -- 'Central', 'Branch', 'Transit', 'Defective', 'Consignment'
    address TEXT NULL,
    city VARCHAR(100) NULL,
    manager_name VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON public.warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(tenant_id, code);

-- 2. Warehouse Stocks (Depo Bazlı Ürün/Varyant Stokları)
CREATE TABLE IF NOT EXISTS public.warehouse_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    reserved_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    bin_location VARCHAR(100) NULL, -- Örn: "Raf A-12, Göz 3"
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_warehouse_product_variant UNIQUE (tenant_id, warehouse_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stocks_lookup ON public.warehouse_stocks(tenant_id, warehouse_id, product_id);

-- 3. Stock Transfers (Depolar Arası Transfer Fişleri)
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    transfer_number VARCHAR(50) NOT NULL,
    source_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    target_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Dispatched', 'Received', 'Cancelled'
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatch_date TIMESTAMPTZ NULL,
    received_date TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_by_user_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON public.stock_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_number ON public.stock_transfers(tenant_id, transfer_number);

-- 4. Stock Transfer Items (Transfer Kalemleri)
CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id UUID NULL REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity NUMERIC(18, 4) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON public.stock_transfer_items(tenant_id, transfer_id);

-- 5. Stock Counts (Periyodik Stok Sayım Fişleri)
CREATE TABLE IF NOT EXISTS public.stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    count_number VARCHAR(50) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- 'Draft', 'InProgress', 'Completed', 'Cancelled'
    count_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_date TIMESTAMPTZ NULL,
    notes TEXT NULL,
    counted_by_user_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_tenant ON public.stock_counts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_number ON public.stock_counts(tenant_id, count_number);

-- 6. Stock Count Items (Sayım Kalemleri: Sistem vs Fiili Sayım)
CREATE TABLE IF NOT EXISTS public.stock_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    count_id UUID NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id UUID NULL REFERENCES public.product_variants(id) ON DELETE SET NULL,
    system_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    counted_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    difference NUMERIC(18, 4) NOT NULL DEFAULT 0.0000, -- (counted_quantity - system_quantity)
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_count_items_count ON public.stock_count_items(tenant_id, count_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for warehouses"
    ON public.warehouses FOR ALL
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid));

CREATE POLICY "Tenant isolation for warehouse_stocks"
    ON public.warehouse_stocks FOR ALL
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid));

CREATE POLICY "Tenant isolation for stock_transfers"
    ON public.stock_transfers FOR ALL
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid));

CREATE POLICY "Tenant isolation for stock_transfer_items"
    ON public.stock_transfer_items FOR ALL
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid));

CREATE POLICY "Tenant isolation for stock_counts"
    ON public.stock_counts FOR ALL
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid));

CREATE POLICY "Tenant isolation for stock_count_items"
    ON public.stock_count_items FOR ALL
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid));
