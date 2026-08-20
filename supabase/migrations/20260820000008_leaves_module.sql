-- ==============================================================================
-- Migration: 20260820000008_leaves_module.sql
-- Description: Leave Requests and Leave Balances with RLS and Permissions
-- ==============================================================================

-- 1. Leave Balances Table (Yıllık İzin Hakediş ve Bakiye)
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    year INT NOT NULL,
    total_days NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    used_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    pending_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    remaining_days NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leave_balances_employee_year UNIQUE (tenant_id, employee_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_tenant_employee ON public.leave_balances(tenant_id, employee_id);

-- 2. Leave Requests Table (İzin Talepleri)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(255),
    leave_type VARCHAR(50) NOT NULL DEFAULT 'Annual', -- Annual, Casual, Sick, Unpaid, Marriage, Maternity, Paternity, Bereavement, Other
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    half_day_period VARCHAR(20), -- Morning, Afternoon
    reason TEXT,
    emergency_contact VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected, Cancelled
    approved_by_user_id UUID,
    approved_by_user_name VARCHAR(255),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_status ON public.leave_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_employee ON public.leave_requests(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_dates ON public.leave_requests(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_dept ON public.leave_requests(tenant_id, department_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS leave_balances_tenant_isolation ON public.leave_balances;
CREATE POLICY leave_balances_tenant_isolation ON public.leave_balances
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS leave_requests_tenant_isolation ON public.leave_requests;
CREATE POLICY leave_requests_tenant_isolation ON public.leave_requests
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- 5. Seed Permissions for Leaves
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Leaves.View', 'İzinleri Görüntüle', 'İzin listesini, takvimini ve kendi taleplerini görüntüleyebilir.', 'Leaves'),
    (gen_random_uuid(), 'Leaves.Create', 'İzin Talebi Oluştur', 'Kendisi veya çalışanlar için izin talebi oluşturabilir.', 'Leaves'),
    (gen_random_uuid(), 'Leaves.Approve', 'İzin Onayla / Reddet', 'Bağlı çalışanların izin taleplerini onaylayabilir veya reddedebilir.', 'Leaves'),
    (gen_random_uuid(), 'Leaves.ManageBalances', 'İzin Bakiyelerini Yönet', 'Çalışanların yıllık izin gün hakedişlerini düzenleyebilir.', 'Leaves')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to Owner, Admin and Super Admin roles across all tenants
DO $$
DECLARE
    r RECORD;
    p RECORD;
BEGIN
    FOR r IN SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin') LOOP
        FOR p IN SELECT id FROM public.permissions WHERE module = 'Leaves' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (r.id, p.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
