-- Sol.52 — Public proposals (web view + PPT) persistence.
-- Each row backs both the `/proposal/[id]` interactive web view and the
-- corresponding downloadable .pptx. Stores minimal customer + financial
-- snapshot plus the full input payload as JSONB for replay.

CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  client_ref text NULL,
  lead_id uuid NULL,
  customer_id text NULL,

  customer_name text NOT NULL,
  honored_name text NULL,
  location text NULL,
  state text NULL,
  discom text NULL,
  tariff_category text NULL,
  connection_type text NULL,
  connected_load_kw numeric NULL,
  area_profile text NULL CHECK (area_profile IN ('urban','rural') OR area_profile IS NULL),

  system_kw numeric NOT NULL,
  panels integer NULL,
  panel_brand text NULL,

  yearly_bill_inr numeric NULL,
  after_solar_inr numeric NULL,
  annual_saving_inr numeric NULL,
  gross_system_cost_inr numeric NULL,
  pm_subsidy_inr numeric NULL,
  net_cost_inr numeric NULL,
  payback_years numeric NULL,
  lifetime25_profit_inr numeric NULL,
  total_reduction_pct integer NULL,
  summer_pct integer NULL,
  fixed_annual_inr numeric NULL,

  installer_name text NULL,
  installer_contact text NULL,
  installer_tagline text NULL,

  -- Full original input (so we can re-render PPT exactly as generated).
  ppt_input jsonb NOT NULL,
  -- Computed summary cache (auditRows, solarVsGrid, env etc.).
  summary jsonb NULL,

  generated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NULL,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz NULL,
  expires_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS proposals_client_ref_idx ON public.proposals (client_ref);
CREATE INDEX IF NOT EXISTS proposals_lead_id_idx ON public.proposals (lead_id);
CREATE INDEX IF NOT EXISTS proposals_share_token_idx ON public.proposals (share_token);
CREATE INDEX IF NOT EXISTS proposals_generated_at_idx ON public.proposals (generated_at DESC);

COMMENT ON TABLE public.proposals IS 'Public solar proposals — drives /proposal/[id] web view + PPT download';
