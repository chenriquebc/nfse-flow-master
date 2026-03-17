
ALTER TABLE public.nfse_invoices
  ADD COLUMN IF NOT EXISTS municipal_tax_code text,
  ADD COLUMN IF NOT EXISTS issqn_exemption boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS issqn_city text;
