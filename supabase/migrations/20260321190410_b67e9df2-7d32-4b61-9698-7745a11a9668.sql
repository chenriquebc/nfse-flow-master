-- Allow tenant admins to view profiles of users in their tenant
CREATE POLICY "Tenant admins can view member profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT tm.user_id FROM public.tenant_members tm
    WHERE tm.tenant_id IN (SELECT public.get_user_tenant_ids())
  )
);