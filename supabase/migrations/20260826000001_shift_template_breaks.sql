-- ==============================================================================
-- Migration: 20260826000001_shift_template_breaks.sql
-- Description: Shift Template Breaks - multiple break periods per shift template
--              Adds public.shift_template_breaks for flexible break scheduling.
--              Preserves public.shift_templates.break_duration_minutes as deprecated
--              nullable fallback for backward compatibility (no DROP COLUMN).
-- ==============================================================================

-- 1. Shift Template Breaks Table (Vardiya Molalari - coklu mola destegi)
CREATE TABLE IF NOT EXISTS public.shift_template_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shift_template_id UUID NOT NULL REFERENCES public.shift_templates(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL DEFAULT 'Mola',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_shift_template_breaks_time_range CHECK (end_time > start_time)
);

-- NOTE: break_duration_minutes on shift_templates is retained as deprecated fallback.
-- Do NOT drop: COMMENT documents deprecation while preserving data for existing rows.
COMMENT ON COLUMN public.shift_templates.break_duration_minutes IS 'DEPRECATED: Use shift_template_breaks table for multiple breaks. Retained for backward compatibility as fallback when no break rows exist.';

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_shift_template_breaks_template ON public.shift_template_breaks(shift_template_id);
CREATE INDEX IF NOT EXISTS idx_shift_template_breaks_tenant_template ON public.shift_template_breaks(tenant_id, shift_template_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.shift_template_breaks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy - Tenant Isolation (matches shift_templates pattern)
DROP POLICY IF EXISTS shift_template_breaks_tenant_isolation ON public.shift_template_breaks;
CREATE POLICY shift_template_breaks_tenant_isolation ON public.shift_template_breaks
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 5. Updated At Trigger (keep updated_at fresh on row changes)
DROP TRIGGER IF EXISTS trg_shift_template_breaks_updated_at ON public.shift_template_breaks;
CREATE OR REPLACE FUNCTION public.set_shift_template_breaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shift_template_breaks_updated_at
    BEFORE UPDATE ON public.shift_template_breaks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_shift_template_breaks_updated_at();
