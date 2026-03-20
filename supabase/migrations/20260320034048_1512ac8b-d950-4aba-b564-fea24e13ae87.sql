
-- Add subscription and stripe fields to tenants
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Add activation fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Create platform_admins table (separate from tenant roles)
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view this table
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Platform admins can view admins"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage admins"
  ON public.platform_admins FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read ALL tenants (bypass tenant RLS)
CREATE POLICY "Platform admins can view all tenants"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to update ALL tenants
CREATE POLICY "Platform admins can update all tenants"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to view all profiles
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to update all profiles
CREATE POLICY "Platform admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to view all audit logs
CREATE POLICY "Platform admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to view all tenant_members
CREATE POLICY "Platform admins can view all tenant members"
  ON public.tenant_members FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to manage all tenant_members
CREATE POLICY "Platform admins can manage all tenant members"
  ON public.tenant_members FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));
