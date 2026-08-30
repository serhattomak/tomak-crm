-- ==============================================================================
-- MIGRATION: 20260830000001_promotions_module.sql
-- DESCRIPTION: Campaigns, Targets/Rules, Coupons, Usages, and Redemptions with RLS
-- ==============================================================================

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100), -- Opsiyonel dahili kampanya takip kodu
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'Percentage', -- 'Percentage', 'FixedAmount', 'CartThreshold', 'BuyXGetY', 'FreeShipping'
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'Automatic', -- 'Automatic', 'CouponCode'
    discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Yüzde değeri (örn: 20.00) veya Tutar değeri (örn: 100.00)
    
    -- Koşullar ve Limitler
    min_order_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Minimum sepet tutarı
    max_discount_amount NUMERIC(15, 2), -- Maksimum indirim tavanı (Cap - Yüzdesel indirimler için)
    min_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00, -- Minimum adet koşulu
    buy_quantity INT DEFAULT 0, -- X Al Y Öde için X
    get_quantity INT DEFAULT 0, -- X Al Y Öde için Y
    get_discount_rate NUMERIC(5, 2) DEFAULT 100.00, -- Y ürününe uygulanacak indirim (%100 bedava, %50 yarısı vs.)

    -- Zamanlama
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Öncelik ve Birleştirme (Stacking)
    priority INT NOT NULL DEFAULT 0, -- Yüksek olan önce hesaplanır
    is_stackable BOOLEAN NOT NULL DEFAULT false, -- Diğer kampanyalarla birleşebilir mi?

    -- Kullanım Kotaları
    total_usage_limit INT, -- Toplam kaç kez kullanılabilir (NULL = limitsiz)
    per_customer_usage_limit INT DEFAULT 1, -- Müşteri başına maksimum kullanım
    current_usage_count INT NOT NULL DEFAULT 0,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON public.campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active_dates ON public.campaigns(tenant_id, is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON public.campaigns(tenant_id, type);

-- 2. CAMPAIGN TARGETS / RULES TABLE (Kapsam Kısıtlamaları: Ürün, Kategori, Marka, Müşteri, Segment)
CREATE TABLE IF NOT EXISTS public.campaign_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- 'Product', 'Category', 'Brand', 'Customer', 'CustomerGroup'
    target_id VARCHAR(100) NOT NULL, -- Product ID, Category ID, Customer ID veya Brand adı
    target_name VARCHAR(255), -- Görsel kolaylık için ad
    rule_condition VARCHAR(20) NOT NULL DEFAULT 'Include', -- 'Include' (Dahil), 'Exclude' (Hariç)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign ON public.campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_lookup ON public.campaign_targets(tenant_id, target_type, target_id);

-- 3. COUPONS TABLE (Kupon Kodları)
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Standard', -- 'Standard' (Genel), 'SingleUse' (Tek Kullanımlık), 'Dynamic' (Özel Atanmış)
    max_uses INT NOT NULL DEFAULT 1,
    used_count INT NOT NULL DEFAULT 0,
    assigned_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    assigned_customer_name VARCHAR(255),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    batch_id VARCHAR(100), -- Toplu üretim takibi için (Bulk Batch ID)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_coupons_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_tenant_code ON public.coupons(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_coupons_campaign ON public.coupons(campaign_id);
CREATE INDEX IF NOT EXISTS idx_coupons_batch ON public.coupons(tenant_id, batch_id);

-- 4. CAMPAIGN USAGES & REDEMPTIONS (Kullanım Geçmişi & Raporlama)
CREATE TABLE IF NOT EXISTS public.campaign_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    order_total_before NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    order_total_after NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_usages_tenant ON public.campaign_usages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_usages_campaign ON public.campaign_usages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_usages_coupon ON public.campaign_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_campaign_usages_customer ON public.campaign_usages(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_usages_order ON public.campaign_usages(order_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_tenant_isolation ON public.campaigns;
CREATE POLICY campaigns_tenant_isolation ON public.campaigns
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS campaign_targets_tenant_isolation ON public.campaign_targets;
CREATE POLICY campaign_targets_tenant_isolation ON public.campaign_targets
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS coupons_tenant_isolation ON public.coupons;
CREATE POLICY coupons_tenant_isolation ON public.coupons
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS campaign_usages_tenant_isolation ON public.campaign_usages;
CREATE POLICY campaign_usages_tenant_isolation ON public.campaign_usages
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- 6. PERMISSIONS SEED
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Promotions.View', 'Kampanyaları Görüntüle', 'Kampanyaları, kuponları ve kullanım istatistiklerini görüntüleyebilir.', 'Promotions'),
    (gen_random_uuid(), 'Promotions.Create', 'Kampanya Oluştur', 'Yeni kampanya ve kupon tanımlayabilir.', 'Promotions'),
    (gen_random_uuid(), 'Promotions.Update', 'Kampanya Güncelle', 'Mevcut kampanyaları ve kupon kurallarını düzenleyebilir.', 'Promotions'),
    (gen_random_uuid(), 'Promotions.Delete', 'Kampanya Sil', 'Kampanyaları ve kuponları silebilir.', 'Promotions'),
    (gen_random_uuid(), 'Promotions.GenerateCoupons', 'Toplu Kupon Üret', 'Toplu tek kullanımlık kupon kodları üretebilir ve dışa aktarabilir.', 'Promotions')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to Owner, Admin and Super Admin roles across all tenants
DO $$
DECLARE
    r RECORD;
    p RECORD;
BEGIN
    FOR r IN SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin') LOOP
        FOR p IN SELECT id FROM public.permissions WHERE module = 'Promotions' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (r.id, p.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 7. SEED TENANT MODULE FOR EXISTING TENANTS
INSERT INTO public.tenant_modules (id, tenant_id, module_key, is_enabled, display_name, config_json)
SELECT 
    gen_random_uuid(),
    t.id,
    'promotions',
    true,
    'Kampanyalar & Kuponlar',
    '{"enableCoupons": true, "enableBulkGenerator": true, "enableStacking": true}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, module_key) DO NOTHING;
