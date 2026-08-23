-- ============================================================================
-- 1. PIPELINES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'Kanban',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    routing_strategy VARCHAR(50) NOT NULL DEFAULT 'RoundRobin', -- 'RoundRobin', 'LeastLoaded', 'OnlineOnly', 'Manual'
    target_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON public.pipelines (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_active ON public.pipelines (tenant_id, is_active);

-- ============================================================================
-- 2. PIPELINE STAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    color VARCHAR(50) DEFAULT '#6B7280',
    probability INT NOT NULL DEFAULT 50, -- 0 to 100%
    sla_hours INT, -- Max hours in this stage before flagged as SLA breached/stale
    is_won_stage BOOLEAN NOT NULL DEFAULT FALSE,
    is_lost_stage BOOLEAN NOT NULL DEFAULT FALSE,
    routing_rule_override VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON public.pipeline_stages (pipeline_id, order_index);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON public.pipeline_stages (tenant_id);

-- ============================================================================
-- 3. DEALS TABLE (Fırsatlar / Pipeline Kartları)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE RESTRICT,
    stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    value NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- 'Open', 'Won', 'Lost', 'Abandoned'
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_user_name VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'Manual', -- 'LiveChat', 'WebForm', 'Campaign', 'InboundEmail', 'Manual', 'Api'
    source_reference_id VARCHAR(255), -- e.g. SupportSessionId or Webform Lead Id
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sla_due_date TIMESTAMPTZ,
    lost_reason TEXT,
    won_reason TEXT,
    tags TEXT[],
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_tenant ON public.deals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals (pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer ON public.deals (customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON public.deals (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_source ON public.deals (source, source_reference_id);

-- ============================================================================
-- 4. DEAL ACTIVITIES TABLE (Aşama Değişimleri, Atamalar, Loglar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deal_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    activity_type VARCHAR(50) NOT NULL, -- 'StageChange', 'AssignmentChange', 'NoteAdded', 'ValueUpdated', 'StatusChange', 'ChatLinked'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON public.deal_activities (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_activities_tenant ON public.deal_activities (tenant_id);

-- ============================================================================
-- 5. DEAL NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_notes_deal ON public.deal_notes (deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_tenant ON public.deal_notes (tenant_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

-- Pipelines RLS
DROP POLICY IF EXISTS pipelines_tenant_isolation ON public.pipelines;
CREATE POLICY pipelines_tenant_isolation ON public.pipelines
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = pipelines.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Stages RLS
DROP POLICY IF EXISTS pipeline_stages_tenant_isolation ON public.pipeline_stages;
CREATE POLICY pipeline_stages_tenant_isolation ON public.pipeline_stages
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = pipeline_stages.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Deals RLS
DROP POLICY IF EXISTS deals_tenant_isolation ON public.deals;
CREATE POLICY deals_tenant_isolation ON public.deals
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = deals.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Deal Activities RLS
DROP POLICY IF EXISTS deal_activities_tenant_isolation ON public.deal_activities;
CREATE POLICY deal_activities_tenant_isolation ON public.deal_activities
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = deal_activities.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Deal Notes RLS
DROP POLICY IF EXISTS deal_notes_tenant_isolation ON public.deal_notes;
CREATE POLICY deal_notes_tenant_isolation ON public.deal_notes
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = deal_notes.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 7. SEED PIPELINE & DEAL PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions (id, module, name, code, description)
VALUES 
    (uuid_generate_v4(), 'Pipelines', 'Pipeline Görüntüleme', 'Pipelines.View', 'Pipeline ve aşamaları listeler.'),
    (uuid_generate_v4(), 'Pipelines', 'Pipeline Yönetimi', 'Pipelines.Manage', 'Yeni pipeline ve aşama oluşturur, düzenler veya siler.'),
    (uuid_generate_v4(), 'Pipelines', 'Tüm Fırsatları Görüntüleme', 'Deals.ViewAll', 'Tüm çalışanların fırsat ve kartlarını görür.'),
    (uuid_generate_v4(), 'Pipelines', 'Fırsat Görüntüleme', 'Deals.View', 'Kendisine atanan veya havuzdaki fırsatları görür.'),
    (uuid_generate_v4(), 'Pipelines', 'Fırsat Oluşturma', 'Deals.Create', 'Yeni fırsat ve pipeline kartı açar.'),
    (uuid_generate_v4(), 'Pipelines', 'Fırsat Güncelleme', 'Deals.Update', 'Fırsat aşamasını, tutarını ve detaylarını günceller.'),
    (uuid_generate_v4(), 'Pipelines', 'Fırsat Atama & Devretme', 'Deals.Assign', 'Fırsatları çalışanlara atar veya havuza aktarır.'),
    (uuid_generate_v4(), 'Pipelines', 'Fırsat Silme', 'Deals.Delete', 'Fırsat kartlarını siler.')
ON CONFLICT (code) DO NOTHING;

-- Grant all Pipeline permissions to Owner and Admin roles
DO $$
DECLARE
    role_rec RECORD;
    perm_rec RECORD;
BEGIN
    FOR role_rec IN 
        SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin')
    LOOP
        FOR perm_rec IN 
            SELECT id FROM public.permissions WHERE module = 'Pipelines'
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (role_rec.id, perm_rec.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
