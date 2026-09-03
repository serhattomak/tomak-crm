-- ==============================================================================
-- MIGRATION: 20260904000001_product_price_history.sql
-- DESCRIPTION: F2-3 — Product price history ledger (selling/cost price changes)
-- ==============================================================================

-- 1. PRODUCT PRICE HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    old_cost_price NUMERIC(18, 2),
    new_cost_price NUMERIC(18, 2),
    old_selling_price NUMERIC(18, 2),
    new_selling_price NUMERIC(18, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    change_reason VARCHAR(255),
    changed_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_tenant ON public.product_price_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON public.product_price_history(product_id, created_at DESC);

-- 2. RLS
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_price_history_tenant_isolation ON public.product_price_history;
CREATE POLICY product_price_history_tenant_isolation ON public.product_price_history
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = public.product_price_history.tenant_id
            AND tm.user_id = auth.uid()
        )
    );
