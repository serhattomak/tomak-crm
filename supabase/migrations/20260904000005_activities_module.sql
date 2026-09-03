-- ==============================================================================
-- CRM.Modules.Activities (Takvim, Randevu, Toplantı ve Müşteri Görüşme Hub'ı)
-- Migration: 20260904000005_activities_module.sql
-- ==============================================================================

-- 1. ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'Meeting',       -- Meeting, Call, Task, Visit
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',   -- Scheduled, Completed, Cancelled, Missed
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',    -- Low, Medium, High, Urgent
    
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    
    -- Call & Meeting Logging Details
    call_direction VARCHAR(50),                        -- Incoming, Outgoing
    call_outcome VARCHAR(50),                          -- Interested, ProposalRequested, LeftMessage, NoAnswer, Busy, WrongNumber, FollowUpNeeded, Other
    call_duration_minutes INT,
    outcome_notes TEXT,
    
    -- CRM Entity Relations
    customer_id UUID,
    customer_name VARCHAR(255),
    deal_id UUID,
    deal_title VARCHAR(255),
    
    assigned_user_id UUID,
    assigned_user_name VARCHAR(255),
    created_by_user_id UUID,
    created_by_user_name VARCHAR(255),
    
    reminder_minutes_before INT DEFAULT 15,
    attendees_json TEXT,                               -- JSON array of attendees
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON public.activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON public.activities(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_activities_customer ON public.activities(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON public.activities(tenant_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_assigned ON public.activities(tenant_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type_status ON public.activities(tenant_id, type, status);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS activities_tenant_isolation ON public.activities;
    CREATE POLICY activities_tenant_isolation ON public.activities
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
END $$;

-- 3. PERMISSIONS SEED
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Activities.View', 'Aktiviteleri Görüntüle', 'Takvim, randevu ve görüşme kayıtlarını görüntüleme', 'Activities'),
    (gen_random_uuid(), 'Activities.Create', 'Aktivite Oluştur', 'Yeni randevu, toplantı veya çağrı notu ekleme', 'Activities'),
    (gen_random_uuid(), 'Activities.Manage', 'Aktivite Yönet', 'Aktivite ve toplantı detaylarını düzenleme', 'Activities'),
    (gen_random_uuid(), 'Activities.Delete', 'Aktivite Sil', 'Aktivite kayıtlarını silme', 'Activities')
ON CONFLICT (code) DO NOTHING;
