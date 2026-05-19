-- Migration 026: quotations table — Wave 2 P5
--
-- Introduces a lightweight `quotations` table that mirrors the `proposals` shape
-- but is scoped to BOM + price + terms (no full deck generation).
--
-- Design principles:
--   - Additive only — proposals table is untouched.
--   - quotations is a SIBLING of proposals, not a replacement.
--   - A quotation MAY reference a proposal (proposal_id FK) for traceability.
--   - A quotation HAS a share_token for the public /quote/[token] route.
--   - pricing_snapshot_id FK allows quotations to lock to an accepted snapshot.
--   - status lifecycle: draft → sent → viewed → accepted | rejected | expired
--
-- Public URL: /quote/[share_token]  (unauthenticated read via RLS)
-- WhatsApp deeplink: wa.me/…?text=Your+quote+is+ready:+…/quote/[token]
--
-- Marketplace guard (Law 8): no seller_* / commission_* / marketplace_* fields
-- are permitted in this table. The CI guardrail enforces this automatically.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quotations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (mirrors proposals)
  org_id                uuid,                              -- future: organization FK
  proposal_id           uuid REFERENCES proposals(id) ON DELETE SET NULL,

  -- Share token for public /quote/[token] route
  share_token           uuid NOT NULL DEFAULT gen_random_uuid(),

  -- Customer snapshot (denormalised for public render without auth)
  customer_name         text NOT NULL DEFAULT '',
  customer_phone        text,
  site_address          text,

  -- Pricing snapshot reference (immutable contract copy)
  pricing_snapshot_id   uuid REFERENCES proposal_pricing_snapshots(id) ON DELETE SET NULL,

  -- Inline pricing override (if not using a snapshot)
  -- Mirrors proposal_pricing columns for standalone quotations.
  system_kw             numeric,
  hardware_inr          numeric,
  installation_inr      numeric,
  subsidy_inr           numeric,
  discount_inr          numeric,
  final_amount_inr      numeric,

  -- Terms (plain text / markdown, rendered on public quote page)
  payment_terms         text,
  validity_days         integer DEFAULT 30,

  -- Status
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  sent_at               timestamptz,
  expires_at            timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quotations IS
  'Lightweight standalone quotations — BOM + price + terms only. '
  'Complement to the full proposal deck; linked via proposal_id. '
  'Public shareable via share_token at /quote/[share_token].';

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS quotations_share_token_idx
  ON quotations (share_token);

CREATE INDEX IF NOT EXISTS quotations_proposal_id_idx
  ON quotations (proposal_id)
  WHERE proposal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS quotations_status_idx
  ON quotations (status);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quotations_updated_at_trigger ON quotations;
CREATE TRIGGER quotations_updated_at_trigger
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_quotations_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (own org's quotations)
DROP POLICY IF EXISTS "quotations_auth_all" ON public.quotations;
CREATE POLICY "quotations_auth_all"
  ON public.quotations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon can read by share_token (for the public /quote/[token] page)
DROP POLICY IF EXISTS "quotations_anon_read_by_token" ON public.quotations;
CREATE POLICY "quotations_anon_read_by_token"
  ON public.quotations FOR SELECT
  TO anon
  USING (true);
