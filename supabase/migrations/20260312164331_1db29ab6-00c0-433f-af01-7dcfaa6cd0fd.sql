
-- ===========================================
-- ENUMS
-- ===========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
CREATE TYPE public.nfse_status AS ENUM ('draft', 'processing', 'authorized', 'rejected', 'cancelled', 'substituted');
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');
CREATE TYPE public.job_type AS ENUM ('emit', 'cancel', 'substitute', 'query_batch', 'query_status');
CREATE TYPE public.nfse_event_type AS ENUM ('created', 'xml_generated', 'xml_signed', 'submitted', 'protocol_received', 'batch_queried', 'authorized', 'rejected', 'cancelled', 'substituted', 'error');

-- ===========================================
-- PROFILES (linked to auth.users)
-- ===========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- TENANTS (Escritórios de Contabilidade)
-- ===========================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  plan TEXT NOT NULL DEFAULT 'basic',
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TENANT MEMBERS (links users to tenants)
-- ===========================================
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- USER ROLES (separated table for security)
-- ===========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE(user_id, tenant_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ===========================================
-- RLS POLICIES for tenants
-- ===========================================
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can update their tenants" ON public.tenants
  FOR UPDATE USING (id IN (SELECT public.get_user_tenant_ids()) AND public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- RLS POLICIES for tenant_members
-- ===========================================
CREATE POLICY "Users can view members of their tenants" ON public.tenant_members
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can manage members" ON public.tenant_members
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) AND public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- RLS POLICIES for user_roles
-- ===========================================
CREATE POLICY "Users can view roles in their tenants" ON public.user_roles
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()) AND public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- COMPANIES (Empresas Clientes)
-- ===========================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT NOT NULL,
  state_registration TEXT,
  municipal_registration TEXT,
  tax_regime INTEGER DEFAULT 1,
  cnae_code TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_city_code TEXT,
  address_state TEXT,
  address_zip TEXT,
  phone TEXT,
  email TEXT,
  environment INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_tenant ON public.companies(tenant_id);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view companies of their tenants" ON public.companies
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins and operators can manage companies" ON public.companies
  FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins and operators can update companies" ON public.companies
  FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can delete companies" ON public.companies
  FOR DELETE USING (tenant_id IN (SELECT public.get_user_tenant_ids()) AND public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- CERTIFICATES (Certificados A1)
-- ===========================================
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  password_encrypted TEXT NOT NULL DEFAULT '',
  serial_number TEXT,
  issuer TEXT,
  subject TEXT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificates_company ON public.certificates(company_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certificates of their tenants" ON public.certificates
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can manage certificates" ON public.certificates
  FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can update certificates" ON public.certificates
  FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can delete certificates" ON public.certificates
  FOR DELETE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- ===========================================
-- NFS-e INVOICES
-- ===========================================
CREATE TABLE public.nfse_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rps_number BIGINT,
  rps_series TEXT DEFAULT 'RPS',
  rps_type INTEGER DEFAULT 1,
  invoice_number BIGINT,
  verification_code TEXT,
  protocol_number TEXT,
  batch_number TEXT,
  status public.nfse_status NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  competence_date DATE NOT NULL DEFAULT CURRENT_DATE,
  taker_document TEXT NOT NULL DEFAULT '',
  taker_name TEXT NOT NULL DEFAULT '',
  taker_email TEXT,
  taker_phone TEXT,
  taker_address_street TEXT,
  taker_address_number TEXT,
  taker_address_city TEXT,
  taker_address_city_code TEXT,
  taker_address_state TEXT,
  taker_address_zip TEXT,
  service_description TEXT NOT NULL DEFAULT '',
  tax_code TEXT NOT NULL DEFAULT '',
  nbs_code TEXT,
  cnae_code TEXT,
  service_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  deduction_value DECIMAL(15,2) DEFAULT 0,
  discount_value DECIMAL(15,2) DEFAULT 0,
  base_value DECIMAL(15,2) DEFAULT 0,
  iss_rate DECIMAL(5,4) DEFAULT 0,
  iss_value DECIMAL(15,2) DEFAULT 0,
  pis_value DECIMAL(15,2) DEFAULT 0,
  cofins_value DECIMAL(15,2) DEFAULT 0,
  inss_value DECIMAL(15,2) DEFAULT 0,
  ir_value DECIMAL(15,2) DEFAULT 0,
  csll_value DECIMAL(15,2) DEFAULT 0,
  other_deductions DECIMAL(15,2) DEFAULT 0,
  net_value DECIMAL(15,2) DEFAULT 0,
  iss_retained BOOLEAN DEFAULT false,
  xml_rps TEXT,
  xml_signed TEXT,
  xml_response TEXT,
  xml_authorized TEXT,
  danfse_path TEXT,
  replaced_invoice_id UUID REFERENCES public.nfse_invoices(id),
  external_reference TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_tenant ON public.nfse_invoices(tenant_id);
CREATE INDEX idx_invoices_company ON public.nfse_invoices(company_id);
CREATE INDEX idx_invoices_status ON public.nfse_invoices(status);
CREATE INDEX idx_invoices_competence ON public.nfse_invoices(competence_date);

ALTER TABLE public.nfse_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices of their tenants" ON public.nfse_invoices
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can create invoices" ON public.nfse_invoices
  FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can update invoices" ON public.nfse_invoices
  FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Admins can delete invoices" ON public.nfse_invoices
  FOR DELETE USING (tenant_id IN (SELECT public.get_user_tenant_ids()) AND public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- NFS-e EVENTS
-- ===========================================
CREATE TABLE public.nfse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.nfse_invoices(id) ON DELETE CASCADE,
  event_type public.nfse_event_type NOT NULL,
  description TEXT,
  request_xml TEXT,
  response_xml TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_invoice ON public.nfse_events(invoice_id);

ALTER TABLE public.nfse_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events of their tenants" ON public.nfse_events
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Users can create events" ON public.nfse_events
  FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- ===========================================
-- AUDIT LOGS
-- ===========================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON public.audit_logs(tenant_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs of their tenants" ON public.audit_logs
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- ===========================================
-- STORAGE for certificates
-- ===========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);

CREATE POLICY "Users can upload certificates for their tenants" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their certificates" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their certificates" ON storage.objects
  FOR DELETE USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

-- ===========================================
-- UPDATE TIMESTAMP TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.nfse_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- FUNCTION: Create tenant + assign admin on first login
-- ===========================================
CREATE OR REPLACE FUNCTION public.create_tenant_for_user(
  _tenant_name TEXT,
  _tenant_document TEXT DEFAULT '',
  _tenant_email TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, document, email)
  VALUES (_tenant_name, _tenant_document, _tenant_email)
  RETURNING id INTO _tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id)
  VALUES (_tenant_id, auth.uid());

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (auth.uid(), _tenant_id, 'admin');

  RETURN _tenant_id;
END;
$$;
