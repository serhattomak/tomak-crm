-- ==============================================================================
-- Migration: 20260820000010_attendance_module.sql
-- Description: Shift Planning and Attendance (PDKS) Module Tables and Policies
-- ==============================================================================

-- 1. Shift Templates Table (Vardiya Şablonları)
CREATE TABLE IF NOT EXISTS public.shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INT NOT NULL DEFAULT 60,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    is_night_shift BOOLEAN NOT NULL DEFAULT FALSE,
    is_flexible BOOLEAN NOT NULL DEFAULT FALSE,
    min_working_hours INT NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shift_templates_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shift_templates_tenant ON public.shift_templates(tenant_id);

-- 2. Shift Schedules Table (Planlanan Vardiya Atamaları)
CREATE TABLE IF NOT EXISTS public.shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shift_template_id UUID NOT NULL REFERENCES public.shift_templates(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(255),
    date DATE NOT NULL,
    custom_start_time TIME,
    custom_end_time TIME,
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled', -- Scheduled, Completed, Swapped, Cancelled
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shift_schedules_employee_date UNIQUE (tenant_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shift_schedules_tenant_date ON public.shift_schedules(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_tenant_employee ON public.shift_schedules(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_tenant_dept ON public.shift_schedules(tenant_id, department_id);

-- 3. Attendance Records Table (Günlük Devam & Puantaj Kaydı)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(255),
    date DATE NOT NULL,
    shift_schedule_id UUID REFERENCES public.shift_schedules(id) ON DELETE SET NULL,

    first_clock_in TIMESTAMPTZ,
    last_clock_out TIMESTAMPTZ,

    total_worked_minutes INT NOT NULL DEFAULT 0,
    total_break_minutes INT NOT NULL DEFAULT 0,
    expected_worked_minutes INT NOT NULL DEFAULT 480,

    overtime_minutes INT NOT NULL DEFAULT 0, -- 1.5x regular
    holiday_overtime_minutes INT NOT NULL DEFAULT 0, -- 2.0x holiday
    late_minutes INT NOT NULL DEFAULT 0,
    early_leave_minutes INT NOT NULL DEFAULT 0,

    status VARCHAR(50) NOT NULL DEFAULT 'Present', -- Present, Late, EarlyDeparture, Absent, OnLeave, Anomaly
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by_user_id UUID,
    approved_by_user_name VARCHAR(255),
    approved_at TIMESTAMPTZ,
    admin_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_records_employee_date UNIQUE (tenant_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_date ON public.attendance_records(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_employee ON public.attendance_records(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_status ON public.attendance_records(tenant_id, status);

-- 4. Attendance Punches Table (Ham Okutma Kayıtları)
CREATE TABLE IF NOT EXISTS public.attendance_punches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,

    punch_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    punch_type VARCHAR(50) NOT NULL, -- ClockIn, ClockOut, BreakStart, BreakEnd
    break_type VARCHAR(50), -- Lunch, Coffee, Personal, Official
    source VARCHAR(50) NOT NULL DEFAULT 'Web', -- Web, Mobile, DeviceBiometric, DeviceCard, KioskQR, ManualAdmin
    device_id UUID,
    ip_address VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_within_geofence BOOLEAN NOT NULL DEFAULT TRUE,
    verification_method VARCHAR(50) DEFAULT 'WebSession',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_punches_tenant_rec ON public.attendance_punches(tenant_id, attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_tenant_emp ON public.attendance_punches(tenant_id, employee_id, punch_time);

-- 5. Attendance Devices Table (Donanım Cihazları ve Turnikeler)
CREATE TABLE IF NOT EXISTS public.attendance_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    device_code VARCHAR(50) NOT NULL,
    device_type VARCHAR(50) NOT NULL DEFAULT 'RFIDCard', -- RFIDCard, Fingerprint, FaceRecognition, KioskTablet
    ip_address VARCHAR(100),
    port INT,
    api_key VARCHAR(100) NOT NULL,
    location_name VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_ping_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_devices_tenant_code UNIQUE (tenant_id, device_code)
);

CREATE INDEX IF NOT EXISTS idx_attendance_devices_tenant ON public.attendance_devices(tenant_id);

-- 6. Attendance Correction Requests Table (Düzeltme Talepleri)
CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    requested_clock_in TIMESTAMPTZ,
    requested_clock_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    reviewed_by_user_id UUID,
    reviewed_by_user_name VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_tenant ON public.attendance_correction_requests(tenant_id, status);

-- 7. Shift Swap Requests Table (Vardiya Takas Talepleri)
CREATE TABLE IF NOT EXISTS public.shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    requester_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    requester_employee_name VARCHAR(255) NOT NULL,
    requester_shift_id UUID NOT NULL REFERENCES public.shift_schedules(id) ON DELETE CASCADE,
    target_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    target_employee_name VARCHAR(255) NOT NULL,
    target_shift_id UUID NOT NULL REFERENCES public.shift_schedules(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PendingTargetAcceptance',
    reason TEXT,
    manager_approved_by_user_id UUID,
    manager_approved_by_user_name VARCHAR(255),
    manager_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_swaps_tenant ON public.shift_swap_requests(tenant_id, status);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
DROP POLICY IF EXISTS shift_templates_tenant_isolation ON public.shift_templates;
CREATE POLICY shift_templates_tenant_isolation ON public.shift_templates
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS shift_schedules_tenant_isolation ON public.shift_schedules;
CREATE POLICY shift_schedules_tenant_isolation ON public.shift_schedules
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS attendance_records_tenant_isolation ON public.attendance_records;
CREATE POLICY attendance_records_tenant_isolation ON public.attendance_records
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS attendance_punches_tenant_isolation ON public.attendance_punches;
CREATE POLICY attendance_punches_tenant_isolation ON public.attendance_punches
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS attendance_devices_tenant_isolation ON public.attendance_devices;
CREATE POLICY attendance_devices_tenant_isolation ON public.attendance_devices
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS attendance_correction_requests_tenant_isolation ON public.attendance_correction_requests;
CREATE POLICY attendance_correction_requests_tenant_isolation ON public.attendance_correction_requests
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS shift_swap_requests_tenant_isolation ON public.shift_swap_requests;
CREATE POLICY shift_swap_requests_tenant_isolation ON public.shift_swap_requests
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 10. Seed Permissions for Attendance Module
INSERT INTO public.permissions (id, module, code, name, description)
VALUES
    (gen_random_uuid(), 'Attendance', 'Attendance.View', 'Vardiya ve PDKS Görüntüleme', 'Personel devam kayıtlarını, canlı monitörü ve vardiya takvimini görüntüler'),
    (gen_random_uuid(), 'Attendance', 'Attendance.Manage', 'Vardiya ve PDKS Yönetimi', 'Vardiya şablonları oluşturur, vardiya atar, düzeltme taleplerini ve cihazları yönetir'),
    (gen_random_uuid(), 'Attendance', 'Attendance.Punch', 'Giriş-Çıkış Okutma', 'Personel giriş, çıkış ve mola okutması yapabilir')
ON CONFLICT (code) DO NOTHING;

-- Grant to Administrator & Manager roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Administrator', 'Manager', 'Yönetici')
  AND p.module = 'Attendance'
ON CONFLICT DO NOTHING;
