-- ==============================================================================
-- Migration: 20260831000001_bugfix_batch.sql
-- Description: Bugfix batch 2026-08-26 — Q1/Q3/Q5 prerequisites
--              1) Quotes: add payment_method (VARCHAR), payment_due_days (INT),
--                 payment_due_date (DATE) — preserve TEXT payment_terms intact
--              2) Recruitment: patch legacy work_model 'Onsite' -> 'OnSite'
--                 (case-insensitive normalize, idempotent)
--              3) Orders: unique index on order_payments(tenant_id, order_id,
--                 reference_number) WHERE reference_number IS NOT NULL
--              No CREATE TYPE — VARCHAR enums only. No DROP TABLE/COLUMN.
--              Idempotent: IF NOT EXISTS / conditional UPDATE.
-- ==============================================================================

-- Ensure public schema is the target (matches existing migrations style)
SET search_path TO public;

-- --------------------------------------------------------------------------
-- 1. QUOTES — Q3 Teklif odeme/vade (A)
--    Add 3 nullable columns; keep existing payment_terms TEXT untouched.
--    No CREATE TYPE / no enum conversion; all enums remain VARCHAR.
-- --------------------------------------------------------------------------
ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS payment_due_days INT;

ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS payment_due_date DATE;

-- Helpful column comments (idempotent — overwrite if exists)
COMMENT ON COLUMN public.quotes.payment_method IS 'Odeme yontemi — VARCHAR enum: BankTransfer, CreditCard, Cash, Check, OpenAccount, etc. (no PG enum type)';
COMMENT ON COLUMN public.quotes.payment_due_days IS 'Vade gunu — fatura/teslim tarihinden itibaren gun sayisi (INT, nullable, installment Faz2 haric)';
COMMENT ON COLUMN public.quotes.payment_due_date IS 'Vade tarihi — hesaplanan veya manuel girilen odeme tarihi (DATE, nullable)';

-- Existing payment_terms TEXT is preserved — no ALTER/DROP on that column.
-- RLS already enabled on quotes; no new RLS policy needed (tenant isolation unchanged).

-- --------------------------------------------------------------------------
-- 2. RECRUITMENT — Q5 work_model invalid (C)
--    Patch legacy typo 'Onsite' -> canonical 'OnSite' (Hybrid/OnSite/Remote).
--    Case-insensitive normalize: lower(work_model) = 'onsite' covers
--    'Onsite', 'onsite', 'ONsite', etc. Idempotent — re-runnable.
-- --------------------------------------------------------------------------
UPDATE public.job_requisitions
SET work_model = 'OnSite'
WHERE work_model IS NOT NULL
  AND lower(work_model) = lower('Onsite')
  AND work_model IS DISTINCT FROM 'OnSite';

-- Also sanitize any other casing variant that lower-matches onsite but
-- is not yet canonical, without touching already-correct 'OnSite', 'Remote', 'Hybrid'.
-- The above single UPDATE is sufficient; keeping predicate explicit for review:
--   WHERE work_model='Onsite'  is the minimal case,
--   WHERE lower(work_model)='onsite' is the case-insensitive extension.

-- --------------------------------------------------------------------------
-- 3. ORDERS — Q1 Siparis tahsilat ReferenceNumber unique per order
--    Partial unique index: per (tenant_id, order_id, reference_number) where
--    reference_number is not null and not empty. Empty string excluded to
--    avoid blocking multiple empty refs. No CONCURRENTLY (transaction-safe).
--    IF NOT EXISTS makes it idempotent.
-- --------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_payments_ref_per_order ON public.order_payments (tenant_id, order_id, reference_number) WHERE reference_number IS NOT NULL AND reference_number <> '';

-- Validate the index covers the required predicate for acceptance checks:
--   ON order_payments(tenant_id, order_id, reference_number) WHERE reference_number IS NOT NULL
-- The additional AND reference_number <> '' is additive and does not break that predicate.

COMMENT ON INDEX public.uq_order_payments_ref_per_order IS
    'Q1: Prevent duplicate ReferenceNumber per order (tenant+order scoped). Partial index where reference_number IS NOT NULL and <> ''''. Supports HardBlock overpayment flow.';

-- RLS already enabled on order_payments; no new policy required.
