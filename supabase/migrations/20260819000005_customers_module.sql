-- ============================================================================
-- 1. CUSTOMERS TABLE (B2B Companies & B2C Individuals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'Company', -- 'Company', 'Individual'
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Lead', -- 'Lead', 'Active', 'Passive', 'Churned'
    tier VARCHAR(50) NOT NULL DEFAULT 'Standard', -- 'VIP', 'Enterprise', 'SME', 'Standard'
    industry VARCHAR(100),
    tags TEXT[], -- Array of tags, e.g. ['Önemli', 'Yeni Müşteri', 'Teknoloji']
    tax_office VARCHAR(150),
    tax_number VARCHAR(50),
    address_line TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Türkiye',
    assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    total_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    deals_count INT NOT NULL DEFAULT 0,
    notes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers (tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON public.customers (tenant_id, tier);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_employee ON public.customers (assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_user ON public.customers (assigned_user_id);

-- ============================================================================
-- 2. CUSTOMER CONTACTS TABLE (Yetkililer / İlgili Kişiler)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(150),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON public.customer_contacts (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant ON public.customer_contacts (tenant_id);

-- ============================================================================
-- 3. CUSTOMER ACTIVITIES TABLE (Aktiviteler, İletişim Logları)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'Call', 'Meeting', 'Email', 'Note', 'StatusChange', 'DealCreated'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_activities_customer ON public.customer_activities (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activities_tenant ON public.customer_activities (tenant_id);

-- ============================================================================
-- 4. CUSTOMER NOTES TABLE (Özel Notlar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON public.customer_notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_tenant ON public.customer_notes (tenant_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- Customers RLS
DROP POLICY IF EXISTS customers_tenant_isolation ON public.customers;
CREATE POLICY customers_tenant_isolation ON public.customers
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = customers.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Contacts RLS
DROP POLICY IF EXISTS customer_contacts_tenant_isolation ON public.customer_contacts;
CREATE POLICY customer_contacts_tenant_isolation ON public.customer_contacts
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = customer_contacts.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Activities RLS
DROP POLICY IF EXISTS customer_activities_tenant_isolation ON public.customer_activities;
CREATE POLICY customer_activities_tenant_isolation ON public.customer_activities
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = customer_activities.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Notes RLS
DROP POLICY IF EXISTS customer_notes_tenant_isolation ON public.customer_notes;
CREATE POLICY customer_notes_tenant_isolation ON public.customer_notes
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = customer_notes.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. SEED CUSTOMER PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions (id, module, name, code, description)
VALUES 
    (uuid_generate_v4(), 'Customers', 'Müşterileri Görüntüleme', 'Customers.View', 'Tüm müşterileri, kontakları ve detayları listeler.'),
    (uuid_generate_v4(), 'Customers', 'Yeni Müşteri Oluşturma', 'Customers.Create', 'Yeni şirket veya şahıs müşterisi ekler.'),
    (uuid_generate_v4(), 'Customers', 'Müşteri Güncelleme', 'Customers.Update', 'Müşteri bilgilerini ve statülerini günceller.'),
    (uuid_generate_v4(), 'Customers', 'Müşteri Silme', 'Customers.Delete', 'Müşteri kaydını ve bağlı verileri siler.'),
    (uuid_generate_v4(), 'Customers', 'Müşteri Raporu Dışa Aktarma', 'Customers.Export', 'Müşteri listesini Excel/CSV olarak dışa aktarır.')
ON CONFLICT (code) DO NOTHING;

-- Grant all Customer permissions to Owner and Admin roles
DO $$
DECLARE
    role_rec RECORD;
    perm_rec RECORD;
BEGIN
    FOR role_rec IN 
        SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin')
    LOOP
        FOR perm_rec IN 
            SELECT id FROM public.permissions WHERE module = 'Customers'
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (role_rec.id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
