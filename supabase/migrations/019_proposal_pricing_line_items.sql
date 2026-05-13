-- Sol.52 — Line-item commercial breakdown (configurator UI) stored alongside rolled-up scalars.

ALTER TABLE public.proposal_pricing
  ADD COLUMN IF NOT EXISTS line_items jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.proposal_pricing.line_items IS 'Editable pricing rows; scalars (hardware_inr, etc.) are derived on save for sync layer';
