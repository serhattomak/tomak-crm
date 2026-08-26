-- ==============================================================================
-- Migration: 20260826000002_recruitment_phase1.sql
-- Description: Recruitment Phase 1 - Job Requisitions, Candidates, Stages,
--              Applications + CV storage bucket (recruitment-cvs). Implements
--              hybrid per-tenant stages with seed data and tenant-isolated RLS.
--              No CREATE TYPE - all enums as VARCHAR. No DROP COLUMN/TABLE.
-- ==============================================================================

-- 1. Job Requisitions Table (Is Ilanlari / Talepler)
CREATE TABLE IF NOT EXISTS public.job_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
    headcount INT NOT NULL DEFAULT 1,
    employment_type VARCHAR(50), -- FullTime, PartTime, Contract, Intern
    work_model VARCHAR(50), -- OnSite, Remote, Hybrid
    location VARCHAR(255),
    min_salary NUMERIC(18,2),
    max_salary NUMERIC(18,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    description TEXT,
    requirements TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Open, Closed, Cancelled
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    closing_date DATE,
    hiring_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Urgent
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_requisitions_headcount CHECK (headcount >= 1),
    CONSTRAINT chk_job_requisitions_salary_range CHECK (max_salary IS NULL OR min_salary IS NULL OR max_salary >= min_salary)
);

-- 2. Recruitment Stages Table (Aşamalar - hibrit per tenant)
CREATE TABLE IF NOT EXISTS public.recruitment_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    is_default BOOLEAN NOT NULL DEFAULT false,
    stage_type VARCHAR(50) NOT NULL DEFAULT 'active', -- active, hired, rejected, withdrawn
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_recruitment_stages_tenant_slug UNIQUE (tenant_id, slug)
);

-- 3. Candidates Table (Aday Havuzu)
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    birth_date DATE,
    address TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'Manual', -- Manual, CsvImport, PublicForm, Referral
    tags TEXT[],
    cv_file_url TEXT,
    cv_file_name VARCHAR(255),
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_given_at TIMESTAMPTZ,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Applications Table (Basvurular - aday + ilan baglanti)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES public.job_requisitions(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.recruitment_stages(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Hired, Rejected, Withdrawn, Archived
    score NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_applications_candidate_requisition UNIQUE (candidate_id, requisition_id),
    CONSTRAINT chk_applications_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_job_requisitions_tenant ON public.job_requisitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_tenant_status ON public.job_requisitions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_tenant_dept ON public.job_requisitions(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_tenant_published ON public.job_requisitions(tenant_id, is_published);

CREATE INDEX IF NOT EXISTS idx_recruitment_stages_tenant ON public.recruitment_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_stages_tenant_sort ON public.recruitment_stages(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_recruitment_stages_tenant_active ON public.recruitment_stages(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON public.candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant_deleted ON public.candidates(tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant_source ON public.candidates(tenant_id, source);
-- Partial unique: tenant_id + email where deleted_at IS NULL (soft-delete aware)
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_tenant_email_active ON public.candidates(tenant_id, email) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_applications_tenant ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant_candidate ON public.applications(tenant_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant_requisition ON public.applications(tenant_id, requisition_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant_stage ON public.applications(tenant_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant_status ON public.applications(tenant_id, status);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Tenant Isolation (matches shift_template_breaks / attendance pattern)
DROP POLICY IF EXISTS job_requisitions_tenant_isolation ON public.job_requisitions;
CREATE POLICY job_requisitions_tenant_isolation ON public.job_requisitions
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS recruitment_stages_tenant_isolation ON public.recruitment_stages;
CREATE POLICY recruitment_stages_tenant_isolation ON public.recruitment_stages
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS candidates_tenant_isolation ON public.candidates;
CREATE POLICY candidates_tenant_isolation ON public.candidates
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS applications_tenant_isolation ON public.applications;
CREATE POLICY applications_tenant_isolation ON public.applications
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 8. Updated At Triggers
DROP TRIGGER IF EXISTS trg_job_requisitions_updated_at ON public.job_requisitions;
CREATE OR REPLACE FUNCTION public.set_job_requisitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_requisitions_updated_at
    BEFORE UPDATE ON public.job_requisitions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_job_requisitions_updated_at();

DROP TRIGGER IF EXISTS trg_recruitment_stages_updated_at ON public.recruitment_stages;
CREATE OR REPLACE FUNCTION public.set_recruitment_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recruitment_stages_updated_at
    BEFORE UPDATE ON public.recruitment_stages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_recruitment_stages_updated_at();

DROP TRIGGER IF EXISTS trg_candidates_updated_at ON public.candidates;
CREATE OR REPLACE FUNCTION public.set_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidates_updated_at
    BEFORE UPDATE ON public.candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_candidates_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated_at ON public.applications;
CREATE OR REPLACE FUNCTION public.set_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_applications_updated_at();

-- 9. Storage Bucket: recruitment-cvs (private, 5MB, PDF/DOC/DOCX)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'recruitment-cvs',
    'recruitment-cvs',
    false,
    5242880,
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 10. Storage Policies for recruitment-cvs (tenant folder prefix check)
-- Objects are stored as: <tenant_id>/<candidate_id>/<timestamp>-<filename>
-- Folder prefix [1] must equal app.current_tenant_id
DROP POLICY IF EXISTS "recruitment_cvs_insert" ON storage.objects;
CREATE POLICY "recruitment_cvs_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'recruitment-cvs'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

DROP POLICY IF EXISTS "recruitment_cvs_select" ON storage.objects;
CREATE POLICY "recruitment_cvs_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'recruitment-cvs'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

DROP POLICY IF EXISTS "recruitment_cvs_update" ON storage.objects;
CREATE POLICY "recruitment_cvs_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'recruitment-cvs'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    )
    WITH CHECK (
        bucket_id = 'recruitment-cvs'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

DROP POLICY IF EXISTS "recruitment_cvs_delete" ON storage.objects;
CREATE POLICY "recruitment_cvs_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'recruitment-cvs'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

-- 11. Seed 7 Default Stages per Tenant (hybrid global, is_default not deletable)
-- Applied, Screening, Interview, Offer, Hired + Rejected, Withdrawn
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM public.tenants LOOP
        INSERT INTO public.recruitment_stages (id, tenant_id, name, slug, sort_order, color_hex, is_default, stage_type, is_active)
        VALUES
            (gen_random_uuid(), t.id, 'Applied',   'applied',   1, '#6B7280', true, 'active',    true),
            (gen_random_uuid(), t.id, 'Screening', 'screening', 2, '#3B82F6', true, 'active',    true),
            (gen_random_uuid(), t.id, 'Interview', 'interview', 3, '#F59E0B', true, 'active',    true),
            (gen_random_uuid(), t.id, 'Offer',     'offer',     4, '#8B5CF6', true, 'active',    true),
            (gen_random_uuid(), t.id, 'Hired',     'hired',     5, '#10B981', true, 'hired',     true),
            (gen_random_uuid(), t.id, 'Rejected',  'rejected',  6, '#EF4444', true, 'rejected',  true),
            (gen_random_uuid(), t.id, 'Withdrawn', 'withdrawn', 7, '#9CA3AF', true, 'withdrawn', true)
        ON CONFLICT (tenant_id, slug) DO NOTHING;
    END LOOP;
END $$;
