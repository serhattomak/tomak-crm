-- ============================================================================
-- Fix user foreign key constraint & support member invitations
-- ============================================================================

-- 1. Drop foreign key constraint on public.users(id) referencing auth.users(id)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. Ensure referencing foreign keys have ON UPDATE CASCADE
ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_user_id_fkey;
ALTER TABLE public.tenant_members ADD CONSTRAINT tenant_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;
ALTER TABLE public.employees ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_assigned_user_id_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Update handle_new_user function to handle invited users seamlessly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    owner_role_id UUID;
    user_name VARCHAR(200);
    user_slug VARCHAR(100);
    clean_email_prefix VARCHAR(100);
    existing_user_id UUID;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Check if user was already invited / exists in public.users by email
    SELECT id INTO existing_user_id FROM public.users WHERE lower(email) = lower(NEW.email);

    IF existing_user_id IS NOT NULL THEN
        -- Update existing user ID to match auth.users ID (cascades to tenant_members, user_roles, etc.)
        UPDATE public.users
        SET id = NEW.id,
            full_name = COALESCE(user_name, full_name),
            avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
            updated_at = NOW()
        WHERE id = existing_user_id;
    ELSE
        -- Insert new user
        INSERT INTO public.users (id, email, full_name, avatar_url, is_active, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            user_name,
            NEW.raw_user_meta_data->>'avatar_url',
            TRUE,
            NOW(),
            NOW()
        );

        -- Create default workspace only if not invited into any workspace
        clean_email_prefix := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
        user_slug := clean_email_prefix || '-' || substring(NEW.id::text from 1 for 6);
        
        INSERT INTO public.tenants (name, slug, is_active)
        VALUES (
            user_name || '''s Workspace',
            user_slug,
            TRUE
        )
        RETURNING id INTO new_tenant_id;

        INSERT INTO public.tenant_members (tenant_id, user_id, is_owner)
        VALUES (new_tenant_id, NEW.id, TRUE);

        INSERT INTO public.roles (tenant_id, name, description, is_default)
        VALUES (new_tenant_id, 'Owner', 'Full access to all tenant resources and management', TRUE)
        RETURNING id INTO owner_role_id;

        INSERT INTO public.roles (tenant_id, name, description, is_default)
        VALUES (new_tenant_id, 'Member', 'Standard tenant member with view and update access', FALSE);

        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT owner_role_id, id FROM public.permissions;

        INSERT INTO public.user_roles (tenant_id, user_id, role_id)
        VALUES (new_tenant_id, NEW.id, owner_role_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
