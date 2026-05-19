-- Migration 024: proposals.lang_mode + story_mode (additive, Wave 1 P4)
--
-- Adds two optional JSONB/text columns to `proposals`:
--
--   lang_mode  text  — the language in which the proposal was generated.
--                      Values: 'en' | 'hi' | 'bilingual'
--                      Default: 'en' (backward compatible)
--
--   story_mode jsonb — the story/narrative variant selected by the installer.
--                      Shape: { segment: StorySegment, mode: StoryMode }
--                      NULL means no story mode selected (uses default copy).
--                      Populated by Wave 3 P6 implementation.
--
-- Both columns are additive and non-breaking:
--   - Existing proposals remain valid (lang_mode defaults to 'en', story_mode is NULL).
--   - New proposals can optionally set both columns.
--   - The public web proposal renderer reads lang_mode from proposal_extras.lang (existing)
--     first, and falls back to this column. story_mode is read by the commercial
--     block renderer in Wave 3.
--
-- RLS: follows existing proposals table policy (anon select on share token,
--      authenticated insert/update for owner org).

-- ─── lang_mode column ────────────────────────────────────────────────────────

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS lang_mode text
    CHECK (lang_mode IN ('en', 'hi', 'bilingual'))
    DEFAULT 'en';

COMMENT ON COLUMN proposals.lang_mode IS
  'Language mode for the generated proposal output. '
  'en = English only, hi = Hindi only, bilingual = mixed EN/HI sections. '
  'Defaults to en for backward compatibility. Set from proposal builder lang toggle.';

-- Backfill: read lang from proposal_extras.lang where present.
-- This is a safe no-op for rows where proposal_extras is NULL or does not have a lang key.
UPDATE proposals
SET lang_mode = CASE
  WHEN proposal_extras->>'lang' = 'hi' THEN 'hi'
  ELSE 'en'
END
WHERE lang_mode IS NULL OR lang_mode = 'en';

-- ─── story_mode column (Wave 3 placeholder) ──────────────────────────────────

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS story_mode jsonb DEFAULT NULL;

COMMENT ON COLUMN proposals.story_mode IS
  'Commercial storytelling variant for the proposal deck. '
  'Shape: { "segment": "hotel"|"hospital"|"factory"|"warehouse"|"dairy"|"school", '
  '"mode": "executive_pitch"|"cfo_brief"|"operations_brief"|"sustainability_story" }. '
  'NULL = default copy. Populated by Wave 3 P6 story mode implementation. '
  'Only relevant for commercial_executive preset.';

-- ─── Index for analytics queries (lang_mode distribution) ────────────────────

CREATE INDEX IF NOT EXISTS proposals_lang_mode_idx
  ON proposals (lang_mode);
