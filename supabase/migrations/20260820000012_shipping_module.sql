-- ==============================================================================
-- Migration: 20260820000012_shipping_module.sql
-- Description: Shipping & Fulfillment Management Module (Kargo ve Sevkiyat)
-- ==============================================================================

-- 1. Shipping Carriers Table (Kargo Taşıyıcı Şirketleri)
CREATE TABLE IF NOT EXISTS public.shipping_carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- YURTICI, ARAS, MNG, SURAT, PTT, HEPSIJET, TRENDYOL_EXPRESS, DHL, COURIER
    name VARCHAR(150) NOT NULL,
    tracking_url_template VARCHAR(500), -- https://tracking.example.com/?code={tracking_number}
    customer_account_number VARCHAR(100),
    branch_code VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shipping_carrier UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shipping_carriers_tenant ON public.shipping_carriers(tenant_id);

-- 2. Shipments Table (Kargo Paketleri ve Sevkiyatlar)
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shipment_number VARCHAR(50) NOT NULL, -- SHP-20260820-001
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number VARCHAR(100),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    carrier_id UUID REFERENCES public.shipping_carriers(id) ON DELETE SET NULL,
    carrier_name VARCHAR(150),
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(500),
    type VARCHAR(50) NOT NULL DEFAULT 'Outbound', -- Outbound (Giden), Return (İade/Gelen)
    status VARCHAR(50) NOT NULL DEFAULT 'Preparing', -- Preparing, Dispatched, InTransit, Delivered, FailedDelivery, Cancelled
    package_count INT NOT NULL DEFAULT 1,
    total_weight_kg NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_desi NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50),
    recipient_address TEXT NOT NULL,
    recipient_city VARCHAR(100),
    recipient_district VARCHAR(100),
    notes TEXT,
    prepared_by_user_id UUID,
    prepared_by_name VARCHAR(255),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shipments_tenant_number UNIQUE (tenant_id, shipment_number)
);

CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON public.shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_status ON public.shipments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_order ON public.shipments(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_customer ON public.shipments(tenant_id, customer_id);

-- 3. Shipment Items Table (Kargo Paketi İçeriğindeki Ürünler)
CREATE TABLE IF NOT EXISTS public.shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'Adet',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_items_tenant_shipment ON public.shipment_items(tenant_id, shipment_id);

-- 4. Shipment Status History Table (Kargo Hareket ve Durum Tarihçesi)
CREATE TABLE IF NOT EXISTS public.shipment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(200),
    description TEXT,
    changed_by_user_id UUID,
    changed_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_history_tenant_shipment ON public.shipment_status_history(tenant_id, shipment_id, created_at);

-- 5. Return Shipments Table (İade Kargo ve Tersine Lojistik Talepleri)
CREATE TABLE IF NOT EXISTS public.return_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    return_code VARCHAR(50) NOT NULL, -- RET-2026-8891
    original_shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    carrier_id UUID REFERENCES public.shipping_carriers(id) ON DELETE SET NULL,
    carrier_name VARCHAR(150),
    tracking_number VARCHAR(100),
    reason VARCHAR(255) NOT NULL, -- Hasarlı Ürün, Yanlış Ürün, Cayma Hakkı, Değişim
    status VARCHAR(50) NOT NULL DEFAULT 'Requested', -- Requested, InTransit, Received, Inspected, Rejected, Restocked
    inspection_notes TEXT,
    inspected_by_user_id UUID,
    inspected_by_name VARCHAR(255),
    inspected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_return_shipments_tenant_code UNIQUE (tenant_id, return_code)
);

CREATE INDEX IF NOT EXISTS idx_return_shipments_tenant ON public.return_shipments(tenant_id, status);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_shipments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS shipping_carriers_tenant_isolation ON public.shipping_carriers;
CREATE POLICY shipping_carriers_tenant_isolation ON public.shipping_carriers
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS shipments_tenant_isolation ON public.shipments;
CREATE POLICY shipments_tenant_isolation ON public.shipments
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS shipment_items_tenant_isolation ON public.shipment_items;
CREATE POLICY shipment_items_tenant_isolation ON public.shipment_items
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS shipment_status_history_tenant_isolation ON public.shipment_status_history;
CREATE POLICY shipment_status_history_tenant_isolation ON public.shipment_status_history
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS return_shipments_tenant_isolation ON public.return_shipments;
CREATE POLICY return_shipments_tenant_isolation ON public.return_shipments
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 8. Seed Permissions for Shipping Module
INSERT INTO public.permissions (id, module, code, name, description)
VALUES
    (gen_random_uuid(), 'Shipping', 'Shipment.View', 'Kargo ve Sevkiyat Görüntüleme', 'Giden ve iade kargo gönderilerini, takip numaralarını görüntüler'),
    (gen_random_uuid(), 'Shipping', 'Shipment.Manage', 'Kargo Paketi ve Sevkiyat Yönetimi', 'Yeni kargo paketleri oluşturur, taşıyıcı ve etiket basar, iade kargo kodu üretir'),
    (gen_random_uuid(), 'Shipping', 'Shipment.Dispatch', 'Kargoya Verme ve Durum İlerletme', 'Kargo durumunu dağıtıma çıkarma, teslim etme ve depoya iade kabulü yapar')
ON CONFLICT (code) DO NOTHING;

-- Grant to Administrator, Manager & Operation roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Administrator', 'Manager', 'Yönetici', 'Operasyon')
  AND p.module = 'Shipping'
ON CONFLICT DO NOTHING;
