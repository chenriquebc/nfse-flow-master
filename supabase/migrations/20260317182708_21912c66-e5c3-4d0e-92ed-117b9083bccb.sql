ALTER TABLE public.nfse_invoices
  ADD COLUMN IF NOT EXISTS tax_assessment_regime text DEFAULT '1';