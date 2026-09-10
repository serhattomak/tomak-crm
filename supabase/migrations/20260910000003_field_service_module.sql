-- ==============================================================================
-- CRM.Modules.FieldService (Saha Servis & Mobil Teknisyen Görev Yönetimi)
-- Migration: 20260910000003_field_service_module.sql
-- ==============================================================================

-- 1. FIELD JOBS TABLE (Saha Servis Emri / İş Kartı)
CREATE TABLE IF NOT EXISTS public.field_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    job_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(50) NOT NULL DEFAULT 'Installation',
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal',

    customer_id UUID,
    customer_name VARCHAR(255),
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    service_address TEXT NOT NULL,
    city VARCHAR(100),
    district VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    assigned_technician_id UUID,
    assigned_technician_name VARCHAR(255),
    scheduled_date DATE,
    scheduled_start_time TIMESTAMPTZ,
    scheduled_end_time TIMESTAMPTZ,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,

    resolution_notes TEXT,
    customer_signature_data TEXT,
    customer_signed_name VARCHAR(255),
    signed_at TIMESTAMPTZ,
    total_cost DECIMAL(18, 2) NOT NULL DEFAULT 0,

    created_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_jobs_tenant ON public.field_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_field_jobs_technician ON public.field_jobs(tenant_id, assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_field_jobs_status ON public.field_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_field_jobs_scheduled_date ON public.field_jobs(tenant_id, scheduled_date);

-- 2. FIELD JOB TASKS TABLE
CREATE TABLE IF NOT EXISTS public.field_job_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    job_id UUID NOT NULL REFERENCES public.field_jobs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by_id UUID,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_job_tasks_job ON public.field_job_tasks(tenant_id, job_id);

-- 3. FIELD JOB PARTS TABLE
CREATE TABLE IF NOT EXISTS public.field_job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    job_id UUID NOT NULL REFERENCES public.field_jobs(id) ON DELETE CASCADE,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    quantity DECIMAL(18, 2) NOT NULL DEFAULT 1,
    total_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_job_parts_job ON public.field_job_parts(tenant_id, job_id);

-- 4. FIELD JOB CHECKINS TABLE
CREATE TABLE IF NOT EXISTS public.field_job_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    job_id UUID NOT NULL REFERENCES public.field_jobs(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL,
    checkin_type VARCHAR(20) NOT NULL DEFAULT 'Arrival',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    device_info VARCHAR(255),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_job_checkins_job ON public.field_job_checkins(tenant_id, job_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.field_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_job_checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS field_jobs_tenant_isolation ON public.field_jobs;
    CREATE POLICY field_jobs_tenant_isolation ON public.field_jobs
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS field_job_tasks_tenant_isolation ON public.field_job_tasks;
    CREATE POLICY field_job_tasks_tenant_isolation ON public.field_job_tasks
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS field_job_parts_tenant_isolation ON public.field_job_parts;
    CREATE POLICY field_job_parts_tenant_isolation ON public.field_job_parts
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS field_job_checkins_tenant_isolation ON public.field_job_checkins;
    CREATE POLICY field_job_checkins_tenant_isolation ON public.field_job_checkins
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
END $$;

-- 6. PERMISSIONS SEED
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'FieldService.View', 'Saha Servis İşlerini Görüntüle', 'Saha servis işlerini ve harita rotalarını inceleme', 'FieldService'),
    (gen_random_uuid(), 'FieldService.Create', 'Servis Emri Oluştur', 'Yeni saha servis iş emri ve görev kartı açma', 'FieldService'),
    (gen_random_uuid(), 'FieldService.Dispatch', 'Teknisyen Atama ve Sevkiyat', 'İş emirlerini teknisyenlere atama ve planlama', 'FieldService'),
    (gen_random_uuid(), 'FieldService.Execute', 'Saha Görevini Tamamla', 'Mobil teknisyen kontrol listesi, GPS check-in ve imza alma', 'FieldService')
ON CONFLICT (code) DO NOTHING;
