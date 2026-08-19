-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TENANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug);

-- ============================================================================
-- 2. USERS TABLE (Linked to auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(200),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- ============================================================================
-- 3. TENANT MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_member UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON public.tenant_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members (user_id);

-- ============================================================================
-- 4. PERMISSIONS TABLE (Global granular permissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions (code);

-- ============================================================================
-- 5. ROLES TABLE (Tenant-scoped roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_role_name UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON public.roles (tenant_id);

-- ============================================================================
-- 6. ROLE_PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- 7. USER_ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON public.user_roles (tenant_id, user_id);

-- ============================================================================
-- 8. SYSTEM PERMISSIONS SEED DATA
-- ============================================================================
INSERT INTO public.permissions (id, code, name, module, description)
VALUES 
    -- Tenants
    (uuid_generate_v4(), 'Tenants.View', 'View Tenant Info', 'Tenants', 'Allows viewing tenant details and settings'),
    (uuid_generate_v4(), 'Tenants.Update', 'Update Tenant Info', 'Tenants', 'Allows modifying tenant details, logo, and settings'),
    (uuid_generate_v4(), 'Tenants.Delete', 'Delete Tenant', 'Tenants', 'Allows deleting or deactivating a tenant'),
    
    -- Users & Members
    (uuid_generate_v4(), 'Users.View', 'View Users', 'Users', 'Allows viewing tenant members and users'),
    (uuid_generate_v4(), 'Users.Invite', 'Invite Users', 'Users', 'Allows inviting new members to the tenant'),
    (uuid_generate_v4(), 'Users.Update', 'Update Users', 'Users', 'Allows updating user status and details within tenant'),
    (uuid_generate_v4(), 'Users.Remove', 'Remove Users', 'Users', 'Allows removing users from the tenant'),
    
    -- Roles & Permissions
    (uuid_generate_v4(), 'Roles.View', 'View Roles', 'Roles', 'Allows viewing roles and assigned permissions'),
    (uuid_generate_v4(), 'Roles.Create', 'Create Role', 'Roles', 'Allows creating new custom roles'),
    (uuid_generate_v4(), 'Roles.Update', 'Update Role', 'Roles', 'Allows updating roles and modifying permission matrices'),
    (uuid_generate_v4(), 'Roles.Delete', 'Delete Role', 'Roles', 'Allows deleting custom roles'),
    (uuid_generate_v4(), 'Roles.Assign', 'Assign Roles', 'Roles', 'Allows assigning and revoking roles for members')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 9. HELPER FUNCTIONS FOR RLS & SESSION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tenants RLS
CREATE POLICY "Users can view tenants they are members of"
ON public.tenants
FOR SELECT
USING (
    id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ) OR id = public.get_current_tenant_id()
);

-- Users RLS
CREATE POLICY "Users can view own profile or fellow tenant members"
ON public.users
FOR SELECT
USING (
    id = auth.uid() OR
    id IN (
        SELECT user_id FROM public.tenant_members WHERE tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Tenant Members RLS
CREATE POLICY "Tenant members can view co-members"
ON public.tenant_members
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ) OR tenant_id = public.get_current_tenant_id()
);

-- Roles RLS
CREATE POLICY "Tenant members can view roles"
ON public.roles
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ) OR tenant_id = public.get_current_tenant_id()
);

-- User Roles RLS
CREATE POLICY "Tenant members can view user roles"
ON public.user_roles
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ) OR tenant_id = public.get_current_tenant_id()
);
