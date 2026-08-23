-- ==============================================================================
-- MIGRATION: 20260823000016_tenant_modules_and_terminology.sql
-- DESCRIPTION: Multi-tenant module activation, industry templates & label overrides
-- ==============================================================================

-- 1. ADD INDUSTRY COLUMNS TO TENANTS
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS industry_template_id UUID;

-- 2. INDUSTRY TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.industry_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    labels_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key for industry_template_id on tenants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenants_industry_template'
    ) THEN
        ALTER TABLE public.tenants
        ADD CONSTRAINT fk_tenants_industry_template
        FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. TENANT MODULES TABLE
CREATE TABLE IF NOT EXISTS public.tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    display_name VARCHAR(200),
    config_json JSONB,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_module UNIQUE (tenant_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON public.tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_key ON public.tenant_modules(tenant_id, module_key);

-- 4. TENANT LABEL OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS public.tenant_label_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    label_key VARCHAR(200) NOT NULL,
    value VARCHAR(500) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_label_key UNIQUE (tenant_id, label_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_label_overrides_tenant ON public.tenant_label_overrides(tenant_id);

-- 5. RLS POLICIES FOR NEW TABLES
ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_label_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read industry templates for all authenticated users"
ON public.industry_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Tenant members can view their modules"
ON public.tenant_modules
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ) OR tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant members can view their label overrides"
ON public.tenant_label_overrides
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ) OR tenant_id = public.get_current_tenant_id()
);

-- 6. SEED DEFAULT INDUSTRY TEMPLATES
INSERT INTO public.industry_templates (key, name, description, default_modules, labels_json)
VALUES 
(
    'general',
    'Genel Ticaret / Hizmet',
    'Standart CRM ve operasyon terminolojisi',
    ARRAY['customers', 'products', 'orders', 'pipelines', 'quotes', 'shipping', 'organization', 'leaves', 'chat'],
    '{
        "modules": {
            "products": { "displayName": "Ürün & Hizmetler" },
            "orders": { "displayName": "Siparişler" },
            "customers": { "displayName": "Müşteriler" },
            "pipelines": { "displayName": "Fırsatlar & Pipeline" }
        },
        "fields": {
            "products.name": "Ürün / Hizmet Adı",
            "products.sku": "Stok Kodu (SKU)",
            "products.brand": "Marka",
            "products.costPrice": "Maliyet Fiyatı",
            "products.sellingPrice": "Satış Fiyatı",
            "orders.title": "Sipariş Başlığı",
            "customers.name": "Müşteri / Firma Adı"
        }
    }'::jsonb
),
(
    'automotive',
    'Otomotiv & Araç Satış / Servis',
    'Otomotiv bayileri ve galericiler için araç odaklı terminoloji',
    ARRAY['customers', 'products', 'orders', 'pipelines', 'quotes', 'organization', 'leaves', 'attendance', 'chat'],
    '{
        "modules": {
            "products": { "displayName": "Araç Stok", "icon": "Car" },
            "orders": { "displayName": "Araç Satışları", "icon": "Receipt" },
            "customers": { "displayName": "Müşteriler / Alıcılar" },
            "pipelines": { "displayName": "Satış Süreçleri" }
        },
        "fields": {
            "products.name": "Araç Modeli & Paket",
            "products.sku": "Şasi No (VIN)",
            "products.brand": "Marka",
            "products.costPrice": "Alış Maliyeti",
            "products.sellingPrice": "Liste Satış Fiyatı",
            "orders.title": "Araç Satış Sözleşmesi",
            "customers.name": "Ruhsat Sahibi / Müşteri"
        }
    }'::jsonb
),
(
    'realestate',
    'Gayrimenkul & Emlak Portföyü',
    'Emlak ofisleri ve gayrimenkul danışmanlıkları için portföy terminolojisi',
    ARRAY['customers', 'products', 'pipelines', 'quotes', 'organization', 'chat'],
    '{
        "modules": {
            "products": { "displayName": "Portföy / İlanlar", "icon": "Building" },
            "orders": { "displayName": "Kira / Satış İşlemleri" },
            "customers": { "displayName": "Portföy Müşterileri / Alıcılar" },
            "pipelines": { "displayName": "Emlak Talep Takibi" }
        },
        "fields": {
            "products.name": "İlan / Gayrimenkul Başlığı",
            "products.sku": "İlan No / Ada-Parsel",
            "products.brand": "Bölge / Lokasyon",
            "products.costPrice": "Ekspertiz / Taban Fiyat",
            "products.sellingPrice": "Portföy Satış / Kira Bedeli",
            "orders.title": "Satış / Kiralama Protokolü",
            "customers.name": "Mülk Sahibi / Talep Eden"
        }
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
