-- Sol.52 — Phase A: Proposal OS pricing snapshot system.
--
-- Snapshots are IMMUTABLE rows. Once created they are NEVER updated.
-- `proposals.accepted_snapshot_id` is the customer contract reference.
-- All renderers must treat a frozen snapshot as the single source of truth
-- for a commercial offer after the customer approves.

-- ── proposal_pricing_snapshots ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proposal_pricing_snapshots (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    uuid         NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  version        integer      NOT NULL DEFAULT 1,

  -- Full ProposalPricingRow payload frozen at snapshot time (JSONB).
  -- Shape: { id, proposal_id, system_kw, price_per_watt_inr, hardware_inr,
  --          installation_inr, structure_inr, subsidy_inr, discount_inr,
  --          final_amount_inr, manual_final_override, line_items[] }
  -- NEVER update this column after insert.
  snapshot_data  jsonb        NOT NULL DEFAULT '{}',

  -- What triggered this snapshot.
  -- sent     = proposal status changed to "sent"
  -- approved = customer formally approved
  -- revised  = installer re-quoted after initial send
  -- manual   = explicit save by installer
  triggered_by   text         NOT NULL DEFAULT 'sent'
                 CHECK (triggered_by IN ('sent', 'approved', 'revised', 'manual')),

  created_at     timestamptz  NOT NULL DEFAULT now(),

  -- Who triggered the snapshot (user id, 'auto', or system actor).
  -- Nullable until auth is fully wired.
  created_by     text,

  -- True when this snapshot has been formally accepted by the customer.
  -- Only one snapshot per proposal may have is_accepted = true.
  is_accepted    boolean      NOT NULL DEFAULT false
);

-- Fast lookup for a proposal's snapshot history (newest first).
CREATE INDEX IF NOT EXISTS proposal_snapshots_proposal_version_idx
  ON public.proposal_pricing_snapshots (proposal_id, version DESC);

-- Enforce uniqueness: only one accepted snapshot per proposal at a time.
-- This is a partial unique index, not a constraint, because partial indexes
-- are the correct Postgres pattern for "unique when column = value".
CREATE UNIQUE INDEX IF NOT EXISTS proposal_snapshots_accepted_unique
  ON public.proposal_pricing_snapshots (proposal_id)
  WHERE (is_accepted = true);

COMMENT ON TABLE public.proposal_pricing_snapshots IS
  'Immutable pricing snapshots for proposals. '
  'One row per version. is_accepted = true marks the customer-accepted contract. '
  'NEVER update snapshot_data after insert.';

COMMENT ON COLUMN public.proposal_pricing_snapshots.snapshot_data IS
  'Full ProposalPricingRow JSON frozen at creation. Shape mirrors proposal_pricing table. '
  'Immutable after insert — revisions create a new row with incremented version.';

COMMENT ON COLUMN public.proposal_pricing_snapshots.is_accepted IS
  'True = customer has accepted this snapshot. '
  'Enforced unique via partial index (only one accepted per proposal).';

-- ── proposals: accepted snapshot pointer ────────────────────────────────────

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS accepted_snapshot_id uuid
    REFERENCES public.proposal_pricing_snapshots (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.proposals.accepted_snapshot_id IS
  'FK to the snapshot the customer accepted. '
  'Immutable once set (SET NULL on snapshot delete for safety, but deletion is disallowed by policy). '
  'Null until proposal reaches "approved" status.';

CREATE INDEX IF NOT EXISTS proposals_accepted_snapshot_idx
  ON public.proposals (accepted_snapshot_id)
  WHERE accepted_snapshot_id IS NOT NULL;

-- ── proposals: preset identifier ────────────────────────────────────────────

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS preset_id text NOT NULL DEFAULT 'residential_smart';

-- Soft constraint — add check only if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proposals_preset_id_check'
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_preset_id_check
      CHECK (preset_id IN ('residential_smart', 'commercial_executive'));
  END IF;
END $$;

COMMENT ON COLUMN public.proposals.preset_id IS
  'Which Proposal OS preset was used to compose this document. '
  'Drives block selection, theme, and data-source defaults. '
  'Allowed: residential_smart | commercial_executive';

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.proposal_pricing_snapshots ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by all server-side routes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proposal_pricing_snapshots'
      AND policyname = 'service_role_all_snapshots'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "service_role_all_snapshots"
        ON public.proposal_pricing_snapshots
        AS PERMISSIVE FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

-- Anon can read snapshots (required for public proposal share link).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proposal_pricing_snapshots'
      AND policyname = 'anon_read_snapshots'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_snapshots"
        ON public.proposal_pricing_snapshots
        AS PERMISSIVE FOR SELECT
        TO anon
        USING (true)
    $policy$;
  END IF;
END $$;
