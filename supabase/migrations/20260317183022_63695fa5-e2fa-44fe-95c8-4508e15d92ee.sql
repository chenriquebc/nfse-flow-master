ALTER TABLE public.nfse_invoices
  ADD COLUMN IF NOT EXISTS intermediary_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS intermediary_document text,
  ADD COLUMN IF NOT EXISTS intermediary_name text,
  ADD COLUMN IF NOT EXISTS intermediary_city text,
  ADD COLUMN IF NOT EXISTS intermediary_city_code text,
  ADD COLUMN IF NOT EXISTS intermediary_state text;