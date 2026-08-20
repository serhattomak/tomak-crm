-- ==============================================================================
-- Migration: 20260820000011_chat_module.sql
-- Description: Team Collaboration Chat and Customer Live Support Module
-- ==============================================================================

-- 1. Chat Channels Table (Kanallar ve Sohbet Odaları)
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'Group', -- Direct, Group, CustomerSupport
    title VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(200),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id UUID,
    last_message_at TIMESTAMPTZ,
    last_message_preview VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant ON public.chat_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant_type ON public.chat_channels(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant_customer ON public.chat_channels(tenant_id, customer_id);

-- 2. Chat Participants Table (Katılımcılar)
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    user_avatar_url VARCHAR(500),
    role VARCHAR(50) NOT NULL DEFAULT 'Member', -- Owner, Admin, Member, Agent, Customer
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_chat_participant UNIQUE (tenant_id, channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_tenant_user ON public.chat_participants(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_tenant_channel ON public.chat_participants(tenant_id, channel_id);

-- 3. Chat Messages Table (Mesajlar)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    sender_user_id UUID,
    sender_name VARCHAR(255) NOT NULL,
    sender_avatar_url VARCHAR(500),
    sender_type VARCHAR(50) NOT NULL DEFAULT 'User', -- User, Customer, System
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'Text', -- Text, InternalNote, SystemEvent, EntityEmbed
    reply_to_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_channel ON public.chat_messages(tenant_id, channel_id, created_at);

-- 4. Chat Attachments Table (Dosya & Görsel Ekleri)
CREATE TABLE IF NOT EXISTS public.chat_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_type VARCHAR(100) NOT NULL DEFAULT 'document',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_tenant_msg ON public.chat_attachments(tenant_id, message_id);

-- 5. Chat Entity Embeds Table (Zengin CRM Varlık Kartları)
CREATE TABLE IF NOT EXISTS public.chat_entity_embeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- Customer, Order, Product, LeaveRequest, ShiftSchedule, AttendanceRecord
    entity_id UUID NOT NULL,
    entity_title VARCHAR(255) NOT NULL,
    entity_subtitle VARCHAR(255),
    entity_status VARCHAR(50),
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_entity_embeds_tenant_msg ON public.chat_entity_embeds(tenant_id, message_id);

-- 6. Canned Responses Table (Hazır Yanıt Şablonları)
CREATE TABLE IF NOT EXISTS public.canned_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shortcut VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Genel',
    content TEXT NOT NULL,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_canned_responses_tenant_shortcut UNIQUE (tenant_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_canned_responses_tenant ON public.canned_responses(tenant_id);

-- 7. Customer Support Sessions Table (Müşteri Canlı Destek Masası)
CREATE TABLE IF NOT EXISTS public.customer_support_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    assigned_user_id UUID,
    assigned_user_name VARCHAR(255),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open, Pending, Resolved, Closed
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Urgent
    subject VARCHAR(255),
    resolution_notes TEXT,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_support_sessions_tenant ON public.customer_support_sessions(tenant_id, status);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_entity_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_support_sessions ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
DROP POLICY IF EXISTS chat_channels_tenant_isolation ON public.chat_channels;
CREATE POLICY chat_channels_tenant_isolation ON public.chat_channels
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS chat_participants_tenant_isolation ON public.chat_participants;
CREATE POLICY chat_participants_tenant_isolation ON public.chat_participants
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS chat_messages_tenant_isolation ON public.chat_messages;
CREATE POLICY chat_messages_tenant_isolation ON public.chat_messages
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS chat_attachments_tenant_isolation ON public.chat_attachments;
CREATE POLICY chat_attachments_tenant_isolation ON public.chat_attachments
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS chat_entity_embeds_tenant_isolation ON public.chat_entity_embeds;
CREATE POLICY chat_entity_embeds_tenant_isolation ON public.chat_entity_embeds
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS canned_responses_tenant_isolation ON public.canned_responses;
CREATE POLICY canned_responses_tenant_isolation ON public.canned_responses
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS customer_support_sessions_tenant_isolation ON public.customer_support_sessions;
CREATE POLICY customer_support_sessions_tenant_isolation ON public.customer_support_sessions
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 10. Seed Permissions for Chat Module
INSERT INTO public.permissions (id, module, code, name, description)
VALUES
    (gen_random_uuid(), 'Chat', 'Chat.View', 'Sohbet ve Mesajları Görüntüleme', 'Ekip kanallarını, direkt mesajları ve konuşmaları görüntüler'),
    (gen_random_uuid(), 'Chat', 'Chat.Manage', 'Sohbet ve Kanal Yönetimi', 'Yeni kanallar oluşturur, üyeleri yönetir, hazır yanıt şablonları ekler'),
    (gen_random_uuid(), 'Chat', 'Chat.Support', 'Müşteri Canlı Destek Temsilcisi', 'Müşteri canlı destek biletlerini yanıtlar, atama yapar ve durumunu günceller')
ON CONFLICT (code) DO NOTHING;

-- Grant to Administrator & Manager roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Administrator', 'Manager', 'Yönetici')
  AND p.module = 'Chat'
ON CONFLICT DO NOTHING;
