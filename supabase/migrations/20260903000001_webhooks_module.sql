-- Migration: 20260903000001_webhooks_module.sql
-- Description: Webhook / Entegrasyon Yonetimi - tenant bazli endpoint CRUD, HMAC imzalama ve delivery log

-- 1. Webhook Endpoints Table
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret_encrypted TEXT,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Webhook Deliveries / Dispatch Log Table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'Success' CHECK (status IN ('Success', 'Failed', 'Retrying')),
    attempt_count INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    response_code INT,
    response_body TEXT,
    duration_ms INT NOT NULL DEFAULT 0,
    hmac_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant_active ON public.webhook_endpoints(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_events_gin ON public.webhook_endpoints USING GIN (events);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_endpoint_status ON public.webhook_deliveries(tenant_id, endpoint_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_endpoint_created ON public.webhook_deliveries(tenant_id, endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_status ON public.webhook_deliveries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_status ON public.webhook_deliveries(endpoint_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_event_type ON public.webhook_deliveries(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry_at ON public.webhook_deliveries(next_retry_at) WHERE status = 'Retrying';

-- 4. Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "webhook_endpoints_tenant_isolation" ON public.webhook_endpoints;
CREATE POLICY "webhook_endpoints_tenant_isolation" ON public.webhook_endpoints
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS "webhook_deliveries_tenant_isolation" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliveries_tenant_isolation" ON public.webhook_deliveries
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 6. Seed Permissions for Webhooks Module
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Webhooks.View', 'Webhooklari Goruntule', 'Webhook endpointlerini ve teslimat loglarini goruntuleme', 'Webhooks'),
    (gen_random_uuid(), 'Webhooks.Create', 'Webhook Olustur', 'Yeni webhook endpointi olusturma', 'Webhooks'),
    (gen_random_uuid(), 'Webhooks.Manage', 'Webhook Yonet', 'Webhook endpointlerini duzenleme ve acip kapatma', 'Webhooks'),
    (gen_random_uuid(), 'Webhooks.Execute', 'Webhook Test & Tetikle', 'Webhook test gonderimi ve manuel tetikleme', 'Webhooks'),
    (gen_random_uuid(), 'Webhooks.Delete', 'Webhook Sil', 'Webhook endpointlerini kalici olarak silme', 'Webhooks')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to Admin roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'SuperAdmin', 'Owner', 'Yönetici')
  AND p.module = 'Webhooks'
ON CONFLICT DO NOTHING;
