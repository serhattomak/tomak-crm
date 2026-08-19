-- ============================================================================
-- AUTH SYNC TRIGGER & AUTOMATIC TENANT INITIALIZATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    owner_role_id UUID;
    user_name VARCHAR(200);
    user_slug VARCHAR(100);
    clean_email_prefix VARCHAR(100);
BEGIN
    -- Extract full name or default from metadata/email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- 1. Insert into public.users
    INSERT INTO public.users (id, email, full_name, avatar_url, is_active, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        NEW.raw_user_meta_data->>'avatar_url',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

    -- 2. Create default organization/workspace for user if not invited
    clean_email_prefix := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
    user_slug := clean_email_prefix || '-' || substring(NEW.id::text from 1 for 6);
    
    INSERT INTO public.tenants (name, slug, is_active)
    VALUES (
        user_name || '''s Workspace',
        user_slug,
        TRUE
    )
    RETURNING id INTO new_tenant_id;

    -- 3. Add user as Owner in tenant_members
    INSERT INTO public.tenant_members (tenant_id, user_id, is_owner)
    VALUES (new_tenant_id, NEW.id, TRUE);

    -- 4. Create default "Owner" and "Member" roles for this tenant
    INSERT INTO public.roles (tenant_id, name, description, is_default)
    VALUES (new_tenant_id, 'Owner', 'Full access to all tenant resources and management', TRUE)
    RETURNING id INTO owner_role_id;

    INSERT INTO public.roles (tenant_id, name, description, is_default)
    VALUES (new_tenant_id, 'Member', 'Standard tenant member with view and update access', FALSE);

    -- 5. Assign ALL current permissions to the Owner role for this tenant
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT owner_role_id, id FROM public.permissions;

    -- 6. Assign Owner role to the user
    INSERT INTO public.user_roles (tenant_id, user_id, role_id)
    VALUES (new_tenant_id, NEW.id, owner_role_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
