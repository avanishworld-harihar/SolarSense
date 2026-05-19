-- Migration 025: customers (leads) org type + size band + commercial proposal_extras fields
--
-- Part of Wave 2 P5: additive CRM fields for commercial solar proposals.
--
-- Changes:
--   leads.organization_type  text  — the commercial segment (hotel, hospital, factory, …)
--   leads.organization_size_band text — small / medium / large (by employee count or energy spend)
--
-- proposal_extras shape extension (jsonb column already exists on proposals):
--   The proposals.proposal_extras JSONB column gains the following optional keys
--   for commercial preset proposals. No migration needed — JSONB is schemaless.
--   These are documented here for reference:
--
--   proposal_extras.contacts[]:        Array of {name, phone, email, designation}
--   proposal_extras.site_address:      Full site address string (for cover page)
--   proposal_extras.lang:              'en' | 'hi' | 'bilingual' (existing)
--   proposal_extras.org_type:          OrgType from lib/org-type-defaults.ts (new Wave 2)
--   proposal_extras.size_band:         'small' | 'medium' | 'large'
--
-- RLS: follows existing leads table policy (authenticated users only).
-- Both new columns are nullable and backward compatible.
-- Existing leads remain valid — NULL org_type = residential / unknown segment.

-- ─── leads.organization_type ─────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS organization_type text
    CHECK (organization_type IN ('hotel', 'hospital', 'factory', 'warehouse', 'dairy', 'school', 'generic'))
    DEFAULT NULL;

COMMENT ON COLUMN leads.organization_type IS
  'Commercial segment for this customer/lead. '
  'NULL = residential or unknown. Used to drive proposal segment defaults and '
  'story mode selection. Values from lib/org-type-defaults.ts OrgType union.';

-- ─── leads.organization_size_band ────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS organization_size_band text
    CHECK (organization_size_band IN ('small', 'medium', 'large'))
    DEFAULT NULL;

COMMENT ON COLUMN leads.organization_size_band IS
  'Size band for commercial organisations: small (<50 employees / <100kW), '
  'medium (50–500 / 100–500kW), large (>500 / >500kW). '
  'NULL = not set or residential. Used for segment-specific copy and pricing defaults.';

-- ─── Index for hub filters ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS leads_organization_type_idx
  ON leads (organization_type)
  WHERE organization_type IS NOT NULL;
