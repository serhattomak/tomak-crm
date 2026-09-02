-- ==============================================================================
-- Migration: 20260903000003_email_module.sql
-- Description: Email Module — email_accounts, email_messages, email_attachments
--              with tenant RLS, indexes, permissions (Emails.*) and Storage
--              bucket email-attachments (10MB, private, tenant-scoped).
--              Follows Webhooks/Automations/Recruitment patterns.
--              Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
--              EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.
-- ==============================================================================

SET search_path TO public;

-- --------------------------------------------------------------------------
-- 1. Email Accounts Table — bound mailbox per tenant (generic IMAP/SMTP, Resend)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'generic_imap',
    imap_host TEXT,
    imap_port INT NOT NULL DEFAULT 993,
    smtp_host TEXT,
    smtp_port INT NOT NULL DEFAULT 587,
    encrypted_password TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_email_accounts_provider CHECK (provider IN ('generic_imap', 'resend'))
);

COMMENT ON TABLE public.email_accounts IS 'Tenant-bound email accounts for IMAP/SMTP or Resend; password encrypted AES-256-GCM base64';
COMMENT ON COLUMN public.email_accounts.encrypted_password IS 'AES-256-GCM base64 encrypted app password / API key, never returned except masked ****abcd';

-- --------------------------------------------------------------------------
-- 2. Email Messages Table — inbound/outbound, thread via normalized subject
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    thread_id UUID,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('Inbound', 'Outbound')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Received', 'Sent', 'Draft', 'Failed', 'Sending')),
    from_address TEXT NOT NULL,
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    subject TEXT,
    html_body TEXT,
    text_body TEXT,
    external_id TEXT,
    customer_id UUID,
    quote_id UUID,
    ticket_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.email_messages IS 'Persisted emails per tenant/account; thread_id groups by normalized subject + account';
COMMENT ON COLUMN public.email_messages.to_addresses IS 'Array of recipient emails TEXT[]; GIN indexed for search';
COMMENT ON COLUMN public.email_messages.thread_id IS 'Virtual thread grouping; first message creates thread, replies share uuid';

-- --------------------------------------------------------------------------
-- 3. Email Attachments Table — Storage-backed files per message
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INT CHECK (size_bytes IS NULL OR size_bytes >= 0),
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.email_attachments IS 'Attachment metadata; file lives in Storage bucket email-attachments/{tenant_id}/{message_id}/{filename}';
COMMENT ON COLUMN public.email_attachments.storage_path IS 'Storage object path inside email-attachments bucket';

-- --------------------------------------------------------------------------
-- 4. Indexes — tenant-scoped hot paths, thread lookup, GIN on to_addresses
-- --------------------------------------------------------------------------
-- email_accounts
CREATE INDEX IF NOT EXISTS idx_email_accounts_tenant_active
    ON public.email_accounts(tenant_id, is_active);

-- email_messages: primary inbox listing (tenant + account + recency)
CREATE INDEX IF NOT EXISTS idx_email_messages_tenant_account_created
    ON public.email_messages(tenant_id, account_id, created_at DESC);

-- email_messages: direction/status filter (Inbox/Sent/Drafts)
CREATE INDEX IF NOT EXISTS idx_email_messages_tenant_direction_status
    ON public.email_messages(tenant_id, direction, status);

-- email_messages: customer linkage filter
CREATE INDEX IF NOT EXISTS idx_email_messages_tenant_customer
    ON public.email_messages(tenant_id, customer_id);

-- email_messages: thread grouping lookup
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id
    ON public.email_messages(thread_id);

-- email_messages: GIN on to_addresses array search
CREATE INDEX IF NOT EXISTS idx_email_messages_to_addresses_gin
    ON public.email_messages USING GIN (to_addresses);

-- optional: GIN on cc_addresses as well for completeness
CREATE INDEX IF NOT EXISTS idx_email_messages_cc_addresses_gin
    ON public.email_messages USING GIN (cc_addresses);

-- email_attachments: message lookup
CREATE INDEX IF NOT EXISTS idx_email_attachments_message_id
    ON public.email_attachments(message_id);

-- email_attachments: tenant + message composite for tenant-scoped fetch
CREATE INDEX IF NOT EXISTS idx_email_attachments_tenant_message
    ON public.email_attachments(tenant_id, message_id);

-- additional helpful index: account_id alone for FK performance
CREATE INDEX IF NOT EXISTS idx_email_messages_account_id
    ON public.email_messages(account_id);

-- --------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS)
-- --------------------------------------------------------------------------
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 6. RLS Policies — tenant isolation via app.current_tenant_id
--    Pattern cloned from automations_module / webhooks_module:
--    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id',true),'')::uuid)
--            WITH CHECK same
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "email_accounts_tenant_isolation" ON public.email_accounts;
CREATE POLICY "email_accounts_tenant_isolation" ON public.email_accounts
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS "email_messages_tenant_isolation" ON public.email_messages;
CREATE POLICY "email_messages_tenant_isolation" ON public.email_messages
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS "email_attachments_tenant_isolation" ON public.email_attachments;
CREATE POLICY "email_attachments_tenant_isolation" ON public.email_attachments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- --------------------------------------------------------------------------
-- 7. Updated_at trigger for email_accounts (matches recruitment pattern)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_email_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_accounts_updated_at ON public.email_accounts;
CREATE TRIGGER trg_email_accounts_updated_at
    BEFORE UPDATE ON public.email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_email_accounts_updated_at();

-- --------------------------------------------------------------------------
-- 8. Seed Permissions for Email Module
--    Follows webhooks_module / automations_module seeding style.
-- --------------------------------------------------------------------------
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Emails.View', 'E-postalari Goruntule', 'E-posta inbox ve gonderilenleri goruntuleme', 'Emails'),
    (gen_random_uuid(), 'Emails.ViewOwn', 'Kendi E-postalarini Goruntule', 'Sadece kendi hesabina ait e-postalari goruntuleme', 'Emails'),
    (gen_random_uuid(), 'Emails.Send', 'E-posta Gonder', 'E-posta olusturma, gonderme ve taslak kaydetme', 'Emails'),
    (gen_random_uuid(), 'Emails.ManageAccounts', 'E-posta Hesaplarini Yonet', 'Bagli e-posta hesaplarini olusturma, duzenleme, test ve silme', 'Emails')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to Admin roles (mirrors webhooks_module)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Admin', 'SuperAdmin', 'Owner', 'Yönetici')
  AND p.module = 'Emails'
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 9. Storage Bucket: email-attachments (private, 10MB limit)
--    Path convention: email-attachments/{tenant_id}/{message_id}/{filename}
--    Tenant isolation via storage.objects policies on foldername()[1].
-- --------------------------------------------------------------------------
-- Minimal insert as per spec (exact string for idempotency check)
INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments','email-attachments',false) ON CONFLICT DO NOTHING;

-- Ensure 10MB limit + mime types (idempotent update; handles case where bucket already exists via minimal insert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'email-attachments',
    'email-attachments',
    false,
    10485760,
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        'application/zip',
        'message/rfc822'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies — tenant folder prefix must equal app.current_tenant_id
DROP POLICY IF EXISTS "email_attachments_insert" ON storage.objects;
CREATE POLICY "email_attachments_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'email-attachments'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

DROP POLICY IF EXISTS "email_attachments_select" ON storage.objects;
CREATE POLICY "email_attachments_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'email-attachments'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

DROP POLICY IF EXISTS "email_attachments_update" ON storage.objects;
CREATE POLICY "email_attachments_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'email-attachments'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    )
    WITH CHECK (
        bucket_id = 'email-attachments'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

DROP POLICY IF EXISTS "email_attachments_delete" ON storage.objects;
CREATE POLICY "email_attachments_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'email-attachments'
        AND (storage.foldername(name))[1] = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    );

-- --------------------------------------------------------------------------
-- 10. Verification helpers (informational, not executed as separate statements
--     that break idempotency):
--     SELECT * FROM pg_tables WHERE tablename LIKE 'email_%';
--     SELECT policyname FROM pg_policies WHERE tablename LIKE 'email_%';
--     SELECT code FROM public.permissions WHERE module = 'Emails';
--     SELECT * FROM storage.buckets WHERE id = 'email-attachments';
-- --------------------------------------------------------------------------
