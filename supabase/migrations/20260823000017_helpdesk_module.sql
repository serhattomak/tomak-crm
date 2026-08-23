-- ==============================================================================
-- Migration: 20260823000017_helpdesk_module.sql
-- Description: HelpDesk & Ticket Management System with SLA and Customer 360
-- ==============================================================================

-- 1. Helpdesk Tickets Table (Destek Talepleri / Biletler)
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL, -- e.g. TICK-1001
    channel_id UUID REFERENCES public.chat_channels(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Genel', -- Teknik, Satış, Fatura, Kargo, İade, Genel
    source VARCHAR(50) NOT NULL DEFAULT 'Web', -- LiveChat, Email, Phone, Web, Internal
    status VARCHAR(50) NOT NULL DEFAULT 'New', -- New, InProgress, PendingCustomer, OnHold, Resolved, Closed
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Urgent
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(200),
    assigned_user_id UUID,
    assigned_user_name VARCHAR(255),
    created_by_user_id UUID,
    
    -- SLA Tracking
    sla_first_response_due_at TIMESTAMPTZ,
    sla_resolution_due_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Linked CRM Entities
    linked_entity_type VARCHAR(50), -- Order, Quote, Product
    linked_entity_id UUID,
    linked_entity_title VARCHAR(255),
    
    -- Satisfaction & Tags
    satisfaction_rating INT, -- 1 to 5
    satisfaction_feedback TEXT,
    tags TEXT[], -- ['kargo-gecikmesi', 'vip-musteri']
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_helpdesk_ticket_number UNIQUE (tenant_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_tenant ON public.helpdesk_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_tenant_status ON public.helpdesk_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_tenant_customer ON public.helpdesk_tickets(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_tenant_assigned ON public.helpdesk_tickets(tenant_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_tenant_created ON public.helpdesk_tickets(tenant_id, created_at DESC);

-- 2. Ticket Activities Table (Bilet İşlem & Denetim Günlüğü)
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- Created, StatusChanged, PriorityChanged, Assigned, InternalNoteAdded, PublicReplyAdded, Resolved, Closed
    description TEXT NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_ticket_activities_ticket ON public.helpdesk_ticket_activities(tenant_id, ticket_id, created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_activities ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS helpdesk_tickets_tenant_isolation ON public.helpdesk_tickets;
CREATE POLICY helpdesk_tickets_tenant_isolation ON public.helpdesk_tickets
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS helpdesk_ticket_activities_tenant_isolation ON public.helpdesk_ticket_activities;
CREATE POLICY helpdesk_ticket_activities_tenant_isolation ON public.helpdesk_ticket_activities
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 5. Seed Permissions for HelpDesk Module
INSERT INTO public.permissions (id, module, code, name, description)
VALUES
    (gen_random_uuid(), 'HelpDesk', 'Tickets.View', 'Destek Taleplerini Görüntüleme', 'HelpDesk panosunu, talepleri ve kuyrukları görüntüler'),
    (gen_random_uuid(), 'HelpDesk', 'Tickets.Create', 'Destek Talebi Oluşturma', 'Müşteri adına yeni destek talebi açar'),
    (gen_random_uuid(), 'HelpDesk', 'Tickets.Manage', 'Destek Talebi Yönetimi', 'Talepleri temsilcilere atar, durum ve öncelik değiştirir, SLA kurallarını yönetir'),
    (gen_random_uuid(), 'HelpDesk', 'Tickets.Reply', 'Destek Talebi Yanıtlama', 'Müşteriye açık yanıt verir ve dahili ekip notları ekler'),
    (gen_random_uuid(), 'HelpDesk', 'Tickets.Delete', 'Destek Talebi Silme', 'Destek taleplerini sistemden siler')
ON CONFLICT (code) DO NOTHING;

-- Grant to Administrator & Manager roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Administrator', 'Manager', 'Yönetici', 'Admin')
  AND p.module = 'HelpDesk'
ON CONFLICT DO NOTHING;
