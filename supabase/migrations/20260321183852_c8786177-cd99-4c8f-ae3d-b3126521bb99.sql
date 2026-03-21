
-- User permissions table for granular access control
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_emit_invoices boolean NOT NULL DEFAULT false,
  can_cancel_invoices boolean NOT NULL DEFAULT false,
  can_manage_companies boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Only tenant admins can manage permissions
CREATE POLICY "Admins can manage permissions"
ON public.user_permissions FOR ALL
TO public
USING (
  tenant_id IN (SELECT get_user_tenant_ids())
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  tenant_id IN (SELECT get_user_tenant_ids())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions FOR SELECT
TO public
USING (user_id = auth.uid());
