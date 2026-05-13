-- Sol.52 — Normalized commercial pricing per proposal (single source for web + PDF + PPT input sync).
-- One row per proposal. Created when a proposal is persisted; updated via PATCH /api/proposals/[id]/pricing.

CREATE TABLE IF NOT EXISTS public.proposal_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  system_kw numeric NOT NULL DEFAULT 0,
  price_per_watt_inr numeric NOT NULL DEFAULT 0,
  hardware_inr numeric NOT NULL DEFAULT 0,
  installation_inr numeric NOT NULL DEFAULT 0,
  structure_inr numeric NOT NULL DEFAULT 0,
  subsidy_inr numeric NOT NULL DEFAULT 0,
  discount_inr numeric NOT NULL DEFAULT 0,
  final_amount_inr numeric NOT NULL DEFAULT 0,
  manual_final_override boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_pricing_proposal_unique UNIQUE (proposal_id)
);

CREATE INDEX IF NOT EXISTS proposal_pricing_proposal_id_idx ON public.proposal_pricing (proposal_id);

COMMENT ON TABLE public.proposal_pricing IS 'Commercial breakdown — canonical row per proposal; synced into proposals.ppt_input for deck math';

ALTER TABLE public.proposal_pricing ENABLE ROW LEVEL SECURITY;

-- Mirror proposals: public-by-link reads use anon key from edge/server.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposal_pricing'
      AND policyname = 'Allow anon read proposal_pricing'
  ) THEN
    CREATE POLICY "Allow anon read proposal_pricing"
      ON public.proposal_pricing
      FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposal_pricing'
      AND policyname = 'Allow authenticated read proposal_pricing'
  ) THEN
    CREATE POLICY "Allow authenticated read proposal_pricing"
      ON public.proposal_pricing
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposal_pricing'
      AND policyname = 'Allow anon insert proposal_pricing'
  ) THEN
    CREATE POLICY "Allow anon insert proposal_pricing"
      ON public.proposal_pricing
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposal_pricing'
      AND policyname = 'Allow authenticated insert proposal_pricing'
  ) THEN
    CREATE POLICY "Allow authenticated insert proposal_pricing"
      ON public.proposal_pricing
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposal_pricing'
      AND policyname = 'Allow anon update proposal_pricing'
  ) THEN
    CREATE POLICY "Allow anon update proposal_pricing"
      ON public.proposal_pricing
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposal_pricing'
      AND policyname = 'Allow authenticated update proposal_pricing'
  ) THEN
    CREATE POLICY "Allow authenticated update proposal_pricing"
      ON public.proposal_pricing
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
