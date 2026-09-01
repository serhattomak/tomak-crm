-- ==============================================================================
-- Migration: 20260901000001_projects_backlog_module.sql
-- Description: Projects & Agile Backlog Management (Epics, Sprints, Work Items)
-- ==============================================================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key VARCHAR(20) NOT NULL, -- e.g. "CRM", "ERP", "MOB"
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Planning, OnHold, Completed, Archived
    lead_user_id UUID,
    lead_user_name VARCHAR(255),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    budget NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    start_date TIMESTAMPTZ,
    target_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_projects_tenant_key UNIQUE (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON public.projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_customer ON public.projects(tenant_id, customer_id);

-- 2. Project Epics Table
CREATE TABLE IF NOT EXISTS public.project_epics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) NOT NULL DEFAULT 'purple', -- purple, blue, emerald, amber, rose, indigo
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Planning, Active, Completed, Cancelled
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_epics_project ON public.project_epics(tenant_id, project_id);

-- 3. Project Sprints Table
CREATE TABLE IF NOT EXISTS public.project_sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g. "Sprint 1", "2026 Q3 - Sprint A"
    goal TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'Planning', -- Planning, Active, Completed, Cancelled
    velocity_points INT NOT NULL DEFAULT 0,
    completed_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_sprints_project ON public.project_sprints(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_sprints_status ON public.project_sprints(tenant_id, status);

-- 4. Backlog / Work Items Table
CREATE TABLE IF NOT EXISTS public.backlog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    item_key VARCHAR(50) NOT NULL, -- e.g. "CRM-101"
    type VARCHAR(50) NOT NULL DEFAULT 'Task', -- Story, Task, Bug, Feature, Improvement
    title VARCHAR(255) NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Backlog', -- Backlog, Todo, InProgress, InReview, Done, Cancelled
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Urgent
    story_points INT NOT NULL DEFAULT 0, -- 1, 2, 3, 5, 8, 13
    estimated_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    logged_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    order_index INT NOT NULL DEFAULT 0,
    
    -- Sprint & Epic Relations
    sprint_id UUID REFERENCES public.project_sprints(id) ON DELETE SET NULL,
    epic_id UUID REFERENCES public.project_epics(id) ON DELETE SET NULL,
    
    -- Assigned & Reporter Users
    assigned_user_id UUID,
    assigned_user_name VARCHAR(255),
    assigned_user_avatar TEXT,
    reporter_user_id UUID,
    reporter_user_name VARCHAR(255),
    
    -- Linked CRM Entities
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES public.helpdesk_tickets(id) ON DELETE SET NULL,
    
    -- Timestamps
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_backlog_items_tenant_key UNIQUE (tenant_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_backlog_items_project ON public.backlog_items(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_sprint ON public.backlog_items(tenant_id, sprint_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_epic ON public.backlog_items(tenant_id, epic_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON public.backlog_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_backlog_items_assigned ON public.backlog_items(tenant_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_customer ON public.backlog_items(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_deal ON public.backlog_items(tenant_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_ticket ON public.backlog_items(tenant_id, ticket_id);

-- 5. Backlog Subtasks Table (Checklist Items)
CREATE TABLE IF NOT EXISTS public.backlog_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    backlog_item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backlog_subtasks_item ON public.backlog_subtasks(tenant_id, backlog_item_id);

-- 6. Backlog Comments Table
CREATE TABLE IF NOT EXISTS public.backlog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    backlog_item_id UUID NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backlog_comments_item ON public.backlog_comments(tenant_id, backlog_item_id, created_at DESC);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_comments ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
DROP POLICY IF EXISTS projects_tenant_isolation ON public.projects;
CREATE POLICY projects_tenant_isolation ON public.projects
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS project_epics_tenant_isolation ON public.project_epics;
CREATE POLICY project_epics_tenant_isolation ON public.project_epics
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS project_sprints_tenant_isolation ON public.project_sprints;
CREATE POLICY project_sprints_tenant_isolation ON public.project_sprints
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS backlog_items_tenant_isolation ON public.backlog_items;
CREATE POLICY backlog_items_tenant_isolation ON public.backlog_items
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS backlog_subtasks_tenant_isolation ON public.backlog_subtasks;
CREATE POLICY backlog_subtasks_tenant_isolation ON public.backlog_subtasks
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS backlog_comments_tenant_isolation ON public.backlog_comments;
CREATE POLICY backlog_comments_tenant_isolation ON public.backlog_comments
    AS RESTRICTIVE
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 9. Seed Permissions for Projects Module
INSERT INTO public.permissions (id, module, code, name, description)
VALUES
    (gen_random_uuid(), 'Projects', 'Projects.View', 'Projeleri ve Backlogu Görüntüleme', 'Projeleri, sprintleri ve iş maddelerini görüntüler'),
    (gen_random_uuid(), 'Projects', 'Projects.Create', 'Proje ve İş Maddesi Oluşturma', 'Yeni proje, sprint, epik ve iş maddesi açar'),
    (gen_random_uuid(), 'Projects', 'Projects.Manage', 'Proje ve Sprint Yönetimi', 'Sprintleri başlatır/tamamlar, görevleri atar ve aşamalarını günceller'),
    (gen_random_uuid(), 'Projects', 'Projects.Delete', 'Proje ve İş Maddesi Silme', 'Projeleri veya görevleri sistemden siler')
ON CONFLICT (code) DO NOTHING;

-- Grant to Administrator & Manager roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Administrator', 'Manager', 'Yönetici', 'Admin')
  AND p.module = 'Projects'
ON CONFLICT DO NOTHING;
