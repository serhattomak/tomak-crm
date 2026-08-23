-- ==============================================================================
-- COMPLIANCE MODULE: 4857 Sayılı İş Kanunu, 5510 SGK, 6331 İSG ve Mevzuat Uyum Motoru
-- Migration: 20260823000019_compliance_module.sql
-- ==============================================================================

-- 1. Create compliance_rules table
CREATE TABLE IF NOT EXISTS public.compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- Nullable: global default rules or tenant-specific overrides
    code VARCHAR(100) NOT NULL,
    law_reference VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'WorkingHours', 'Leaves', 'HealthSafety', 'Payroll', 'Contracts'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    penalty_risk_level VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    penalty_description TEXT,
    enforcement_level VARCHAR(20) NOT NULL DEFAULT 'SoftWarning', -- 'HardBlock', 'SoftWarning', 'Disabled'
    threshold_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_system_rule BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create compliance_violations table (Audit Trail & Risk Log)
CREATE TABLE IF NOT EXISTS public.compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_id UUID REFERENCES public.compliance_rules(id) ON DELETE SET NULL,
    rule_code VARCHAR(100) NOT NULL,
    law_reference VARCHAR(255) NOT NULL,
    employee_id UUID,
    employee_name VARCHAR(255) NOT NULL,
    module_source VARCHAR(50) NOT NULL, -- 'Attendance', 'Leaves', 'Payroll', 'Organization'
    entity_id VARCHAR(100),
    severity VARCHAR(20) NOT NULL DEFAULT 'Warning', -- 'Warning', 'Violation', 'CriticalRisk'
    details TEXT NOT NULL,
    violation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_overridden BOOLEAN NOT NULL DEFAULT false,
    overridden_by_user_id UUID,
    override_reason TEXT,
    overridden_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Resolved', 'Overridden'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_rules_tenant ON public.compliance_rules(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_code ON public.compliance_rules(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_tenant_status ON public.compliance_violations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_employee ON public.compliance_violations(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_created_at ON public.compliance_violations(tenant_id, created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "compliance_rules_tenant_isolation" ON public.compliance_rules;
CREATE POLICY "compliance_rules_tenant_isolation" ON public.compliance_rules
    FOR ALL
    USING (
        tenant_id IS NULL OR
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );

DROP POLICY IF EXISTS "compliance_violations_tenant_isolation" ON public.compliance_violations;
CREATE POLICY "compliance_violations_tenant_isolation" ON public.compliance_violations
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );

-- 6. Seed Compliance Permissions
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Compliance.View', 'Mevzuat ve Uyum Görüntüle', 'Mevzuat kurallarını, risk puanını ve ihlalleri görüntüleme', 'Compliance'),
    (gen_random_uuid(), 'Compliance.Manage', 'Mevzuat Kuralları Yönet', 'Mevzuat kurallarını, ceza eşiklerini ve denetim modunu düzenleme', 'Compliance'),
    (gen_random_uuid(), 'Compliance.Override', 'İhlal Onayı / İstisna Tanımla', 'Mevzuat ihlallerine gerekçe belirterek yönetici onayı verme', 'Compliance'),
    (gen_random_uuid(), 'Compliance.Validate', 'Mevzuat Doğrulama Çalıştır', 'Vardiya ve izinler için mevzuat doğrulama motorunu çalıştırma', 'Compliance')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'SuperAdmin', 'Owner', 'Yönetici')
  AND p.module = 'Compliance'
ON CONFLICT DO NOTHING;
