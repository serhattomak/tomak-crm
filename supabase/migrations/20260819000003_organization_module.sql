-- ============================================================================
-- 1. DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    lead_id UUID, -- References employees(id) (forward-declared, FK added below)
    cost_center VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON public.departments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments (parent_id);

-- ============================================================================
-- 2. JOB POSITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'Mid', -- Executive, Director, Manager, Lead, Senior, Mid, Junior, Intern
    job_description TEXT,
    min_salary NUMERIC(18, 2),
    max_salary NUMERIC(18, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_positions_tenant ON public.job_positions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_department ON public.job_positions (department_id);

-- ============================================================================
-- 3. EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    employee_number VARCHAR(50),
    title VARCHAR(150),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'FullTime', -- FullTime, PartTime, Contractor, Remote, Hybrid, Intern
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, OnLeave, Terminated, Probation
    hire_date DATE,
    avatar_url TEXT,
    salary NUMERIC(18, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees (tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON public.employees (user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees (department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees (manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON public.employees (job_position_id);

-- Add Foreign Key for Department Lead pointing to Employees
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_departments_lead'
    ) THEN
        ALTER TABLE public.departments
        ADD CONSTRAINT fk_departments_lead
        FOREIGN KEY (lead_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Departments RLS
DROP POLICY IF EXISTS departments_tenant_isolation ON public.departments;
CREATE POLICY departments_tenant_isolation ON public.departments
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = departments.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Job Positions RLS
DROP POLICY IF EXISTS job_positions_tenant_isolation ON public.job_positions;
CREATE POLICY job_positions_tenant_isolation ON public.job_positions
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = job_positions.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Employees RLS
DROP POLICY IF EXISTS employees_tenant_isolation ON public.employees;
CREATE POLICY employees_tenant_isolation ON public.employees
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE tenant_members.tenant_id = employees.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. SEED PERMISSIONS FOR ORGANIZATION MODULE
-- ============================================================================
INSERT INTO public.permissions (id, code, name, module, description)
VALUES
    -- Departments
    (uuid_generate_v4(), 'Departments.View', 'View Departments', 'Organization', 'Allows viewing department lists, tree hierarchy, and details'),
    (uuid_generate_v4(), 'Departments.Create', 'Create Department', 'Organization', 'Allows creating new departments and sub-departments'),
    (uuid_generate_v4(), 'Departments.Update', 'Update Department', 'Organization', 'Allows updating department details, assigning leads and re-parenting'),
    (uuid_generate_v4(), 'Departments.Delete', 'Delete Department', 'Organization', 'Allows deleting departments'),

    -- Employees
    (uuid_generate_v4(), 'Employees.View', 'View Employees', 'Organization', 'Allows viewing employee directory, dossiers, and records'),
    (uuid_generate_v4(), 'Employees.Create', 'Create Employee', 'Organization', 'Allows creating new employee records'),
    (uuid_generate_v4(), 'Employees.Update', 'Update Employee', 'Organization', 'Allows modifying employee details, manager, and department transfers'),
    (uuid_generate_v4(), 'Employees.Delete', 'Delete Employee', 'Organization', 'Allows deleting or terminating employee records'),

    -- Organization Chart & Positions
    (uuid_generate_v4(), 'Organization.ViewChart', 'View Org Chart', 'Organization', 'Allows viewing interactive organization chart hierarchy'),
    (uuid_generate_v4(), 'Organization.ManageHierarchy', 'Manage Hierarchy', 'Organization', 'Allows changing managerial reporting structure and hierarchy'),
    (uuid_generate_v4(), 'JobPositions.Manage', 'Manage Job Positions', 'Organization', 'Allows creating and managing job positions, levels, and salary ranges')
ON CONFLICT (code) DO NOTHING;

-- Assign all new organization permissions to existing Owner and Admin roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE (r.name = 'Owner' OR r.name = 'Admin')
  AND p.module = 'Organization'
ON CONFLICT DO NOTHING;
