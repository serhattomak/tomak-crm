-- ==============================================================================
-- Migration: 20260820000009_payroll_module.sql
-- Description: Turkey Payroll (Bordro) Module Tables, RLS, Parameters & Permissions
-- ==============================================================================

-- 1. Payroll Statutory Parameters (Yıllık Mevzuat Parametreleri)
CREATE TABLE IF NOT EXISTS public.payroll_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    year INT NOT NULL,
    title VARCHAR(100) NOT NULL DEFAULT 'Türkiye Yasal Parametreleri',
    
    -- Asgari Ücret & SGK Sınırları
    min_wage_gross NUMERIC(12, 2) NOT NULL DEFAULT 26005.50,
    min_wage_net NUMERIC(12, 2) NOT NULL DEFAULT 22104.68,
    sgk_floor NUMERIC(12, 2) NOT NULL DEFAULT 26005.50,
    sgk_ceiling NUMERIC(12, 2) NOT NULL DEFAULT 195041.25, -- 7.5 katı
    
    -- Oranlar (%)
    sgk_employee_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1400,
    unemployment_employee_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0100,
    sgk_employer_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.2050,
    sgk_employer_discount_5510_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0500,
    unemployment_employer_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    stamp_tax_rate NUMERIC(6, 5) NOT NULL DEFAULT 0.00759,
    bes_default_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0300,
    
    -- Gelir Vergisi Dilimleri (Ücret Gelirleri İçin)
    tax_bracket_1_limit NUMERIC(12, 2) NOT NULL DEFAULT 158000.00,
    tax_bracket_1_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1500,
    
    tax_bracket_2_limit NUMERIC(12, 2) NOT NULL DEFAULT 380000.00,
    tax_bracket_2_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.2000,
    
    tax_bracket_3_limit NUMERIC(12, 2) NOT NULL DEFAULT 1400000.00,
    tax_bracket_3_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.2700,
    
    tax_bracket_4_limit NUMERIC(12, 2) NOT NULL DEFAULT 4300000.00,
    tax_bracket_4_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.3500,
    
    tax_bracket_5_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.4000,
    
    -- 7349 Sayılı Asgari Ücret İstisnaları (Aylık)
    min_wage_tax_exemption NUMERIC(12, 2) NOT NULL DEFAULT 3315.70,
    min_wage_stamp_exemption NUMERIC(12, 2) NOT NULL DEFAULT 197.38,
    
    -- Günlük İstisna Tutarları
    meal_exemption_daily NUMERIC(10, 2) NOT NULL DEFAULT 240.00,
    travel_exemption_daily NUMERIC(10, 2) NOT NULL DEFAULT 126.00,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_parameters_tenant_year UNIQUE (tenant_id, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_parameters_tenant_year ON public.payroll_parameters(tenant_id, year);

-- 2. Payroll Runs (Aylık Bordro Dönemleri)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Calculated, Approved, Locked
    
    total_employees INT NOT NULL DEFAULT 0,
    total_gross NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_net NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_sgk_employee NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_sgk_employer NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_income_tax NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_stamp_tax NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_employer_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    calculated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by_user_id UUID,
    approved_by_user_name VARCHAR(255),
    locked_at TIMESTAMPTZ,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_runs_tenant_period UNIQUE (tenant_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_period ON public.payroll_runs(tenant_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_status ON public.payroll_runs(tenant_id, status);

-- 3. Employee Payrolls (Çalışan Aylık Bordro & Puantaj Kaydı)
CREATE TABLE IF NOT EXISTS public.employee_payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- Çalışan Bilgileri Snapshots
    employee_name VARCHAR(255) NOT NULL,
    employee_number VARCHAR(100),
    tc_identity_number VARCHAR(11),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(255),
    job_title VARCHAR(255),
    iban VARCHAR(50),
    contract_salary_type VARCHAR(20) NOT NULL DEFAULT 'Gross', -- Gross, Net
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Puantaj & Gün Dağılımı (30 Gün Esası)
    worked_days NUMERIC(4, 1) NOT NULL DEFAULT 22.0,
    weekend_days NUMERIC(4, 1) NOT NULL DEFAULT 8.0,
    holiday_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    paid_leave_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    unpaid_leave_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    sick_leave_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    total_paid_days NUMERIC(4, 1) NOT NULL DEFAULT 30.0,
    overtime_hours NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    
    -- Brüt Kazançlar
    normal_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    overtime_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bonus_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    meal_allowance_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    travel_allowance_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- SGK & İşsizlik İşçi Kesintileri
    sgk_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgk_employee_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- %14
    unemployment_employee_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- %1
    
    -- Gelir Vergisi & Kümülatif Matrah
    prior_cumulative_income_tax_base NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    current_income_tax_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_cumulative_income_tax_base NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    calculated_income_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_wage_income_tax_exemption NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- 7349 istisnası
    payable_income_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Damga Vergisi
    calculated_stamp_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_wage_stamp_tax_exemption NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- 7349 istisnası
    payable_stamp_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Özel Kesintiler
    bes_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- %3
    icra_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    private_health_insurance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Net Maaş
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payable_net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- İşveren Maliyeti Kalemleri
    sgk_employer_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- %20.5
    sgk_employer_discount_5510 NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- %5 teşvik indirimi
    unemployment_employer_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- %2
    total_employer_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(50) NOT NULL DEFAULT 'Calculated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_payrolls_run_employee UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_payrolls_run ON public.employee_payrolls(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_employee_payrolls_tenant_emp ON public.employee_payrolls(tenant_id, employee_id);

-- 4. Payroll Earnings (Ek Kazançlar Detayı)
CREATE TABLE IF NOT EXISTS public.payroll_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_payroll_id UUID NOT NULL REFERENCES public.employee_payrolls(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- Bonus, Overtime, Meal, Travel, Premium, Other
    name VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_sgk_exempt BOOLEAN NOT NULL DEFAULT FALSE,
    is_tax_exempt BOOLEAN NOT NULL DEFAULT FALSE,
    is_stamp_exempt BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_earnings_payroll ON public.payroll_earnings(employee_payroll_id);

-- 5. Payroll Deductions (Özel Kesintiler Detayı)
CREATE TABLE IF NOT EXISTS public.payroll_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_payroll_id UUID NOT NULL REFERENCES public.employee_payrolls(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- BES, Icra, Advance, Insurance, Union, Other
    name VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_tax_deductible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_deductions_payroll ON public.payroll_deductions(employee_payroll_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.payroll_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS payroll_parameters_tenant_isolation ON public.payroll_parameters;
CREATE POLICY payroll_parameters_tenant_isolation ON public.payroll_parameters
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS payroll_runs_tenant_isolation ON public.payroll_runs;
CREATE POLICY payroll_runs_tenant_isolation ON public.payroll_runs
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS employee_payrolls_tenant_isolation ON public.employee_payrolls;
CREATE POLICY employee_payrolls_tenant_isolation ON public.employee_payrolls
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS payroll_earnings_tenant_isolation ON public.payroll_earnings;
CREATE POLICY payroll_earnings_tenant_isolation ON public.payroll_earnings
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS payroll_deductions_tenant_isolation ON public.payroll_deductions;
CREATE POLICY payroll_deductions_tenant_isolation ON public.payroll_deductions
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- 8. Seed Permissions for Payroll
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Payroll.View', 'Bordroları Görüntüle', 'Bordro dönemlerini, özetleri ve icmalleri görüntüleyebilir.', 'Payroll'),
    (gen_random_uuid(), 'Payroll.Manage', 'Bordro Yönetimi ve Hesaplama', 'Dönem açabilir, puantaj girebilir ve toplu bordro hesaplayabilir.', 'Payroll'),
    (gen_random_uuid(), 'Payroll.Approve', 'Bordro Onayla & Kilitle', 'Hesaplanan bordro dönemlerini onaylayabilir ve kesinleştirebilir.', 'Payroll'),
    (gen_random_uuid(), 'Payroll.SelfService', 'Kendi Bordromu Görüntüle', 'Çalışan kendi bordro pusulasını görüntüleyebilir ve indirebilir.', 'Payroll'),
    (gen_random_uuid(), 'Payroll.ManageParameters', 'Mevzuat Parametrelerini Yönet', 'Yıllık asgari ücret, SGK ve vergi dilimi parametrelerini güncelleyebilir.', 'Payroll')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to Owner, Admin and Super Admin roles across all tenants
DO $$
DECLARE
    r RECORD;
    p RECORD;
BEGIN
    FOR r IN SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin') LOOP
        FOR p IN SELECT id FROM public.permissions WHERE module = 'Payroll' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (r.id, p.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
