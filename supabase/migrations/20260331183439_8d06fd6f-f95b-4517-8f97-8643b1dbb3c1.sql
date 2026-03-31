-- Add can_delete_invoices column
ALTER TABLE public.user_permissions
ADD COLUMN can_delete_invoices boolean NOT NULL DEFAULT false;

-- Create a security definer function to check delete permission
CREATE OR REPLACE FUNCTION public.can_user_delete_invoices(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND can_delete_invoices = true
  )
$$;

-- Drop existing delete policy
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.nfse_invoices;

-- Create new delete policy: admins OR users with can_delete_invoices permission
CREATE POLICY "Users with permission can delete invoices"
ON public.nfse_invoices FOR DELETE
USING (
  tenant_id IN (SELECT get_user_tenant_ids())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR can_user_delete_invoices(auth.uid(), tenant_id)
  )
);