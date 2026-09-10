-- ==============================================================================
-- Faz 2: GİB e-Arşiv Fatura (UBL-TR 2.1) & WhatsApp Cloud API Entegrasyonu
-- Migration: 20260910000002_earchive_and_whatsapp.sql
-- ==============================================================================

-- 1. INVOICES TABLOSUNA E-ARŞİV ALANLARI EKLEME
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS ettn UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS ubl_xml TEXT,
    ADD COLUMN IF NOT EXISTS is_e_archive BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS e_archive_type VARCHAR(50) NOT NULL DEFAULT 'NORMAL', -- NORMAL, INTERNET, IHRACAT
    ADD COLUMN IF NOT EXISTS e_archive_report_status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Generated, ExportedToGib, Reported
    ADD COLUMN IF NOT EXISTS internet_sales_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS internet_payment_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS carrier_tax_number VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_invoices_ettn ON public.invoices(tenant_id, ettn);
CREATE INDEX IF NOT EXISTS idx_invoices_earchive_status ON public.invoices(tenant_id, e_archive_report_status);

-- 2. WHATSAPP SETTINGS TABLOSU (Meta Cloud API)
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    phone_number_id VARCHAR(100) NOT NULL,
    waba_id VARCHAR(100),                               -- WhatsApp Business Account ID
    access_token TEXT NOT NULL,
    webhook_verify_token VARCHAR(100) NOT NULL,
    business_phone_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_settings_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_tenant ON public.whatsapp_settings(tenant_id);

-- 3. WHATSAPP MESSAGES TABLOSU
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_id UUID,
    customer_name VARCHAR(255),
    phone_number VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,                    -- Inbound, Outbound
    message_text TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(50),                            -- image, document, audio, video
    meta_message_id VARCHAR(150),                      -- WAMID from Meta
    status VARCHAR(50) NOT NULL DEFAULT 'Sent',        -- Sent, Delivered, Read, Failed, Received
    error_message TEXT,
    sender_user_id UUID,
    sender_user_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON public.whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON public.whatsapp_messages(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(tenant_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON public.whatsapp_messages(meta_message_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS whatsapp_settings_tenant_isolation ON public.whatsapp_settings;
    CREATE POLICY whatsapp_settings_tenant_isolation ON public.whatsapp_settings
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS whatsapp_messages_tenant_isolation ON public.whatsapp_messages;
    CREATE POLICY whatsapp_messages_tenant_isolation ON public.whatsapp_messages
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
END $$;

-- 5. PERMISSIONS SEED
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Invoices.EArchive', 'e-Arşiv Fatura ve UBL Yönetimi', 'e-Arşiv UBL-TR XML üretme ve GİB aktarımı', 'Invoicing'),
    (gen_random_uuid(), 'WhatsApp.View', 'WhatsApp Mesajlarını Görüntüle', 'Gelen ve giden WhatsApp konuşmalarını okuma', 'Chat'),
    (gen_random_uuid(), 'WhatsApp.Send', 'WhatsApp Mesajı Gönder', 'Müşteriye WhatsApp üzerinden doğrudan mesaj yazma', 'Chat'),
    (gen_random_uuid(), 'WhatsApp.Settings', 'WhatsApp Ayarlarını Yönet', 'Meta Cloud API anahtarları ve webhook yapılandırması', 'Settings')
ON CONFLICT (code) DO NOTHING;
