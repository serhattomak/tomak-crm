-- ==============================================================================
-- CRM.Modules.Contracts & Customer Portal Access
-- Migration: 20260910000001_contracts_and_portal.sql
-- ==============================================================================

-- 1. CONTRACT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    content_html TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant ON public.contract_templates(tenant_id);

-- 2. CONTRACTS TABLE
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    contract_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255),
    quote_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Sent, Signed, Active, Expired, Cancelled
    
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    
    content_html TEXT NOT NULL,
    template_id UUID,
    
    -- E-Signature & Audit Trail
    signed_at TIMESTAMPTZ,
    signed_by_name VARCHAR(255),
    signed_by_email VARCHAR(255),
    signature_image_url TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    audit_hash VARCHAR(128), -- SHA-256 integrity hash
    
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_by_user_id UUID,
    created_by_user_name VARCHAR(255),
    
    notes TEXT,
    public_token VARCHAR(128) UNIQUE, -- Direct access token for signing
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON public.contracts(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_quote ON public.contracts(tenant_id, quote_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_public_token ON public.contracts(public_token);

-- 3. CUSTOMER PORTAL ACCESS TABLE (Unified Portal Authentication)
CREATE TABLE IF NOT EXISTS public.customer_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    magic_token VARCHAR(128) UNIQUE,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_portal_access_tenant ON public.customer_portal_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_access_token ON public.customer_portal_access(magic_token);
CREATE INDEX IF NOT EXISTS idx_customer_portal_access_customer ON public.customer_portal_access(tenant_id, customer_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS contract_templates_tenant_isolation ON public.contract_templates;
    CREATE POLICY contract_templates_tenant_isolation ON public.contract_templates
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS contracts_tenant_isolation ON public.contracts;
    CREATE POLICY contracts_tenant_isolation ON public.contracts
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS customer_portal_access_tenant_isolation ON public.customer_portal_access;
    CREATE POLICY customer_portal_access_tenant_isolation ON public.customer_portal_access
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
END $$;

-- 5. PERMISSIONS SEED
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Contracts.View', 'Sözleşmeleri Görüntüle', 'Sözleşmeleri ve şablonları listeleme yetkisi', 'Contracts'),
    (gen_random_uuid(), 'Contracts.Create', 'Sözleşme Oluştur', 'Yeni sözleşme veya şablon oluşturma', 'Contracts'),
    (gen_random_uuid(), 'Contracts.Manage', 'Sözleşme Yönet', 'Sözleşme durumunu değiştirme ve düzenleme', 'Contracts'),
    (gen_random_uuid(), 'Contracts.Delete', 'Sözleşme Sil', 'Sözleşmeleri arşivleme veya silme', 'Contracts')
ON CONFLICT (code) DO NOTHING;
