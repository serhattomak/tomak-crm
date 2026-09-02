-- ==============================================================================
-- Migration: 20260903000002_email_templates.sql
-- Description: Email Template Editor — extend quote_templates with subject,
--              html_body and variables_json for Handlebars email rendering.
--              Purely additive, idempotent, preserves existing data & RLS.
--              No DROP TABLE/COLUMN, no CREATE TYPE — additive only.
-- ==============================================================================

SET search_path TO public;

-- --------------------------------------------------------------------------
-- 1. Extend quote_templates — email fields (nullable for backward compat)
--    Idempotent: ADD COLUMN IF NOT EXISTS + IF EXISTS on table.
--    Existing rows retain Name/Terms/BankDetails/IsDefault; new cols = NULL/[].
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.quote_templates
    ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE IF EXISTS public.quote_templates
    ADD COLUMN IF NOT EXISTS html_body TEXT;

ALTER TABLE IF EXISTS public.quote_templates
    ADD COLUMN IF NOT EXISTS variables_json JSONB DEFAULT '[]'::jsonb;

-- --------------------------------------------------------------------------
-- 2. Column comments — documentation for Handlebars usage
-- --------------------------------------------------------------------------
COMMENT ON COLUMN public.quote_templates.subject IS 'Email subject with Handlebars vars e.g. {{customerName}} {{quoteNumber}}';
COMMENT ON COLUMN public.quote_templates.html_body IS 'Email HTML body with Handlebars vars — sanitized on render, itemsTable as raw HTML table';
COMMENT ON COLUMN public.quote_templates.variables_json IS 'Detected Handlebars variables JSON array — e.g. ["customerName","quoteNumber","totalAmount"]';

-- --------------------------------------------------------------------------
-- 3. Indexes — tenant lookup (already exists from 20260820000015, verify via
--    IF NOT EXISTS) + optional GIN for variables_json filtering.
--    No duplicate-index error; idempotent.
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_quote_templates_tenant_id
    ON public.quote_templates(tenant_id);

CREATE INDEX IF NOT EXISTS idx_quote_templates_variables_json_gin
    ON public.quote_templates USING GIN (variables_json);

-- --------------------------------------------------------------------------
-- 4. RLS preserved — quote_templates already has:
--      ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
--      POLICY quote_templates_tenant_isolation USING (
--          tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
--          OR EXISTS (SELECT 1 FROM public.tenant_members ...)
--      );
--    HasQueryFilter in OrdersDbContext still applies. No new RLS needed.
--    Verification only — do not recreate policy here to avoid drift.
-- --------------------------------------------------------------------------
-- RLS is preserved; no ALTER/DROP POLICY in this migration.

-- --------------------------------------------------------------------------
-- 5. Rollback (down migration) — informational only, not executed:
--    ALTER TABLE public.quote_templates DROP COLUMN IF EXISTS subject;
--    ALTER TABLE public.quote_templates DROP COLUMN IF EXISTS html_body;
--    ALTER TABLE public.quote_templates DROP COLUMN IF EXISTS variables_json;
--    DROP INDEX IF EXISTS public.idx_quote_templates_variables_json_gin;
--    -- Do NOT drop idx_quote_templates_tenant_id (owned by base migration).
-- --------------------------------------------------------------------------
