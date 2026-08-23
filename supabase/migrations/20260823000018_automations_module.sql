-- Migration: 20260823000018_automations_module.sql
-- Description: Workflow Automation & Business Rules Engine Schema with RLS and Seed Templates

-- 1. Automation Workflows Table
CREATE TABLE IF NOT EXISTS public.automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'General', -- Sales, Support, Customer, Operations, General
    icon VARCHAR(50) DEFAULT 'Zap',
    color VARCHAR(50) DEFAULT 'blue',
    is_active BOOLEAN NOT NULL DEFAULT true,
    trigger_type VARCHAR(100) NOT NULL, -- Customer.Created, Order.Created, Order.StatusChanged, Ticket.Created, Ticket.SlaBreached, Deal.StageChanged, Webhook.Inbound
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of Condition Groups (AND/OR, field, operator, value)
    actions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of Action Steps (type, order, config, delayMinutes)
    execution_count INT NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automations_tenant_active ON public.automation_workflows(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON public.automation_workflows(tenant_id, trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_category ON public.automation_workflows(tenant_id, category);

-- 2. Automation Executions / Audit Logs Table
CREATE TABLE IF NOT EXISTS public.automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    workflow_name VARCHAR(255) NOT NULL,
    trigger_source VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- Customer, Order, Ticket, Deal, etc.
    entity_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'Success', -- Success, Failed, Skipped, Running
    evaluated_conditions_summary TEXT,
    actions_executed_count INT NOT NULL DEFAULT 0,
    execution_duration_ms INT NOT NULL DEFAULT 0,
    step_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_exec_tenant_workflow ON public.automation_executions(tenant_id, workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_exec_status ON public.automation_executions(tenant_id, status);

-- 3. Enable RLS
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "automation_workflows_tenant_isolation" ON public.automation_workflows;
CREATE POLICY "automation_workflows_tenant_isolation" ON public.automation_workflows
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS "automation_executions_tenant_isolation" ON public.automation_executions;
CREATE POLICY "automation_executions_tenant_isolation" ON public.automation_executions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 5. Seed Permissions for Automations Module
INSERT INTO public.permissions (id, code, name, description, module)
VALUES 
    (gen_random_uuid(), 'Automations.View', 'Otomasyonları Görüntüle', 'Otomasyon akışlarını ve loglarını görüntüleme', 'Automations'),
    (gen_random_uuid(), 'Automations.Create', 'Otomasyon Oluştur', 'Yeni otomasyon akışı oluşturma', 'Automations'),
    (gen_random_uuid(), 'Automations.Manage', 'Otomasyon Yönet', 'Otomasyon akışlarını düzenleme, açıp kapatma ve silme', 'Automations'),
    (gen_random_uuid(), 'Automations.Execute', 'Otomasyon Test & Çalıştır', 'Otomasyonları test etme ve manuel tetikleme', 'Automations'),
    (gen_random_uuid(), 'Automations.Delete', 'Otomasyon Sil', 'Otomasyon akışlarını kalıcı olarak silme', 'Automations')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'SuperAdmin', 'Owner', 'Yönetici')
  AND p.module = 'Automations'
ON CONFLICT DO NOTHING;
