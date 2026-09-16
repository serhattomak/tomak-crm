-- ============================================================================
-- SUPER ADMIN SUPPORT
-- ============================================================================

-- 1. Add is_super_admin column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- 2. FUNCTION: Check if user is super admin
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = check_user_id AND is_super_admin = TRUE AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 3. FUNCTION: Auto-assign new permissions to super admin Owner roles
--    When a new permission is inserted, automatically add it to all
--    Owner roles in tenants where a super admin is a member.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_assign_permission_to_super_admin_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign new permissions to all Owner roles in super admin tenants
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT DISTINCT r.id, NEW.id
    FROM public.roles r
    INNER JOIN public.user_roles ur ON ur.role_id = r.id
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE u.is_super_admin = TRUE
      AND r.name = 'Owner'
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_permission_created_assign_to_super_admins ON public.permissions;

CREATE TRIGGER on_permission_created_assign_to_super_admins
    AFTER INSERT ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_permission_to_super_admin_roles();

-- ============================================================================
-- 4. RLS BYPASS FOR SUPER ADMINS
--    Update existing policies to allow super admins full access
-- ============================================================================

-- Tenants: super admins can see ALL tenants
DROP POLICY IF EXISTS "Users can view tenants they are members of" ON public.tenants;
CREATE POLICY "Users can view tenants they are members of"
ON public.tenants
FOR SELECT
USING (
    public.is_super_admin(auth.uid())
    OR id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
    OR id = public.get_current_tenant_id()
);

-- Users: super admins can see ALL users
DROP POLICY IF EXISTS "Users can view own profile or fellow tenant members" ON public.users;
CREATE POLICY "Users can view own profile or fellow tenant members"
ON public.users
FOR SELECT
USING (
    public.is_super_admin(auth.uid())
    OR id = auth.uid()
    OR id IN (
        SELECT user_id FROM public.tenant_members WHERE tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    )
);

-- Tenant Members: super admins can see ALL memberships
DROP POLICY IF EXISTS "Tenant members can view co-members" ON public.tenant_members;
CREATE POLICY "Tenant members can view co-members"
ON public.tenant_members
FOR SELECT
USING (
    public.is_super_admin(auth.uid())
    OR tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
    OR tenant_id = public.get_current_tenant_id()
);

-- Roles: super admins can see ALL roles
DROP POLICY IF EXISTS "Tenant members can view roles" ON public.roles;
CREATE POLICY "Tenant members can view roles"
ON public.roles
FOR SELECT
USING (
    public.is_super_admin(auth.uid())
    OR tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
    OR tenant_id = public.get_current_tenant_id()
);

-- User Roles: super admins can see ALL user roles
DROP POLICY IF EXISTS "Tenant members can view user roles" ON public.user_roles;
CREATE POLICY "Tenant members can view user roles"
ON public.user_roles
FOR SELECT
USING (
    public.is_super_admin(auth.uid())
    OR tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
    OR tenant_id = public.get_current_tenant_id()
);

-- ============================================================================
-- 5. SEED SUPER ADMIN USER — MOVED OUT OF MIGRATIONS
-- ============================================================================
-- This section used to create admin@crm.local here, with the password written
-- into the file as a literal. That put a working credential in git history and
-- broke the one rule seed data has: migrations carry SCHEMA, seed files carry
-- DATA. Supabase runs `supabase/seed.sql` after all migrations, on `supabase
-- start` and on every `supabase db reset` — which is where a dev user belongs.
--
-- The seed now lives in `supabase/seed.sql`, which is GITIGNORED.
-- `supabase/seed.sql.example` is the committed template: copy it and set your
-- own password.
--
--     cp supabase/seed.sql.example supabase/seed.sql
--
-- NOTE, HONESTLY: this file has ALREADY been applied to the running local
-- database, so this edit changes nothing there. Revoking the leaked credential
-- is a separate, deliberate step. This edit only affects databases created from
-- scratch after today.
