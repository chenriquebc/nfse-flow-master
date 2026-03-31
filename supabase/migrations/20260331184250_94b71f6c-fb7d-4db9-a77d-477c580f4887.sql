
CREATE TABLE public.service_takers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  email text,
  phone text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_city_code text,
  address_state text,
  address_zip text,
  auto_send_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, document)
);

ALTER TABLE public.service_takers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view takers of their tenants"
ON public.service_takers FOR SELECT
USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can create takers"
ON public.service_takers FOR INSERT
WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update takers"
ON public.service_takers FOR UPDATE
USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete takers"
ON public.service_takers FOR DELETE
USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE TRIGGER update_service_takers_updated_at
BEFORE UPDATE ON public.service_takers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
