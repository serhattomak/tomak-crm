-- Fix: infinite recursion detected in policy for relation "tenant_members" (42P17).
--
-- The SELECT policy on public.tenant_members subqueried public.tenant_members
-- from inside its own USING clause. Postgres re-evaluates the policy for that
-- inner query, which re-evaluates itself: any anon/authenticated read of
-- tenant_members -- and of every table whose policy subqueries it -- returned
-- 500 instead of rows.
--
-- A SECURITY DEFINER helper runs as the function owner (the table owner), and
-- table owners bypass RLS unless FORCE ROW LEVEL SECURITY is set, so the inner
-- lookup cannot re-enter the policy. The policy itself still owns the decision.

CREATE OR REPLACE FUNCTION public.current_user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(array_agg(tenant_id), '{}'::uuid[])
    FROM public.tenant_members
    WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_tenant_ids() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Tenant members can view co-members" ON public.tenant_members;

CREATE POLICY "Tenant members can view co-members"
ON public.tenant_members
FOR SELECT
USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR tenant_id = ANY (public.current_user_tenant_ids())
    OR tenant_id = public.get_current_tenant_id()
);
