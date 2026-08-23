-- ============================================================================
-- 1. QUOTES TABLE (Teklifler / Proposals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quote_number VARCHAR(100) NOT NULL, -- e.g. TEK-2026-0001
    revision_number INT NOT NULL DEFAULT 0, -- 0 for R0, 1 for R1...
    parent_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL, -- Previous revision link
    title VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_user_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- 'Draft', 'PendingApproval', 'Approved', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Revised'
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    exchange_rate NUMERIC(18, 4) NOT NULL DEFAULT 1.0000,
    subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'Percentage', -- 'Percentage' or 'Amount'
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    valid_until TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    approval_notes TEXT,
    approved_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    terms_and_conditions TEXT,
    payment_terms TEXT,
    delivery_terms TEXT,
    bank_details TEXT,
    notes TEXT,
    public_view_token VARCHAR(100) NOT NULL,
    converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON public.quotes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON public.quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_deal ON public.quotes (deal_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_number ON public.quotes (tenant_id, quote_number, revision_number);
CREATE INDEX IF NOT EXISTS idx_quotes_token ON public.quotes (public_view_token);

-- ============================================================================
-- 2. QUOTE ITEMS TABLE (Teklif Kalemleri)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    quantity NUMERIC(18, 2) NOT NULL DEFAULT 1.00,
    unit VARCHAR(50) NOT NULL DEFAULT 'Adet',
    unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    is_selected BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items (quote_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quote_items_tenant ON public.quote_items (tenant_id);

-- ============================================================================
-- 3. QUOTE ACTIVITIES TABLE (Teklif Hareket ve Onay Günlüğü)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quote_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    activity_type VARCHAR(50) NOT NULL, -- 'Created', 'Updated', 'Sent', 'Viewed', 'Approved', 'RejectedApproval', 'RevisionCreated', 'Accepted', 'Rejected', 'ConvertedToOrder', 'NoteAdded'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_activities_quote ON public.quote_activities (quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_activities_tenant ON public.quote_activities (tenant_id);

-- ============================================================================
-- 4. QUOTE TEMPLATES TABLE (Hazır Şartlar & Banka Şablonları)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    terms_and_conditions TEXT,
    payment_terms TEXT,
    delivery_terms TEXT,
    bank_details TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_tenant ON public.quote_templates (tenant_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

-- Quotes RLS
DROP POLICY IF EXISTS quotes_tenant_isolation ON public.quotes;
CREATE POLICY quotes_tenant_isolation ON public.quotes
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = quotes.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Quote Items RLS
DROP POLICY IF EXISTS quote_items_tenant_isolation ON public.quote_items;
CREATE POLICY quote_items_tenant_isolation ON public.quote_items
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = quote_items.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Quote Activities RLS
DROP POLICY IF EXISTS quote_activities_tenant_isolation ON public.quote_activities;
CREATE POLICY quote_activities_tenant_isolation ON public.quote_activities
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = quote_activities.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Quote Templates RLS
DROP POLICY IF EXISTS quote_templates_tenant_isolation ON public.quote_templates;
CREATE POLICY quote_templates_tenant_isolation ON public.quote_templates
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = quote_templates.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. SEED QUOTE PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions (id, module, name, code, description)
VALUES 
    (uuid_generate_v4(), 'Quotes', 'Teklif Görüntüleme', 'Quotes.View', 'Teklifleri ve detaylarını listeler.'),
    (uuid_generate_v4(), 'Quotes', 'Teklif Oluşturma', 'Quotes.Create', 'Yeni teklif ve revizyon oluşturur.'),
    (uuid_generate_v4(), 'Quotes', 'Teklif Düzenleme', 'Quotes.Update', 'Teklif bilgilerini ve kalemlerini günceller.'),
    (uuid_generate_v4(), 'Quotes', 'Teklif Onaylama & Limit Yetkisi', 'Quotes.Approve', 'İskonto veya limit aşımı olan teklifleri onaylar/reddeder.'),
    (uuid_generate_v4(), 'Quotes', 'Teklif Silme', 'Quotes.Delete', 'Teklifleri sistemden siler.'),
    (uuid_generate_v4(), 'Quotes', 'Teklif Şablonları Yönetimi', 'Quotes.Templates', 'Şart ve banka şablonlarını yönetir.')
ON CONFLICT (code) DO NOTHING;

-- Grant all Quote permissions to Owner, Admin, Super Admin
DO $$
DECLARE
    role_rec RECORD;
    perm_rec RECORD;
BEGIN
    FOR role_rec IN 
        SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin')
    LOOP
        FOR perm_rec IN 
            SELECT id FROM public.permissions WHERE module = 'Quotes'
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (role_rec.id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
