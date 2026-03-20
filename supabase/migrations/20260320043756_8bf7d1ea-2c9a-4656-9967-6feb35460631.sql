
-- Create leads table for landing page capture
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  company_document TEXT,
  plan_interest TEXT DEFAULT 'professional',
  source TEXT DEFAULT 'landing_page',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, converted, lost
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all leads
CREATE POLICY "Platform admins can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Platform admins can update leads
CREATE POLICY "Platform admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Platform admins can delete leads
CREATE POLICY "Platform admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Anyone can insert a lead (public form)
CREATE POLICY "Anyone can submit a lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admin on new lead
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'new_account',
    'Novo lead captado!',
    NEW.name || ' (' || NEW.email || ') demonstrou interesse no plano ' || COALESCE(NEW.plan_interest, 'não informado') || '.',
    jsonb_build_object('lead_id', NEW.id, 'name', NEW.name, 'email', NEW.email, 'phone', NEW.phone, 'plan', NEW.plan_interest, 'source', NEW.source)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_lead();

-- Index for admin queries
CREATE INDEX idx_leads_status ON public.leads (status, created_at DESC);
