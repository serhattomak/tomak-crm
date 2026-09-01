-- ==============================================================================
-- Migration: 20260831000002_tasks_module.sql
-- Description: Tasks & To-Do Management System with Multi-tenancy and RLS
-- ==============================================================================

-- 1. Create CRM Tasks Table
CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, InProgress, Completed, Cancelled
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    category VARCHAR(100) NOT NULL DEFAULT 'Genel', -- Call, Meeting, FollowUp, Email, Review, Genel
    
    -- Assigned Sales Rep / User
    assigned_user_id UUID,
    assigned_user_name VARCHAR(255),
    
    -- Related CRM Entities
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant ON public.crm_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_completed ON public.crm_tasks(tenant_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_status ON public.crm_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_due_date ON public.crm_tasks(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_assigned ON public.crm_tasks(tenant_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_customer ON public.crm_tasks(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_deal ON public.crm_tasks(tenant_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_created ON public.crm_tasks(tenant_id, created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_tasks_tenant_isolation ON public.crm_tasks;
CREATE POLICY crm_tasks_tenant_isolation ON public.crm_tasks
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
