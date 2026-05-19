-- Migration 028: Commercial proposal configuration (additive JSONB documentation)
--
-- No new columns. commercialConfig is stored inside proposals.ppt_input JSONB:
--
--   commercialConfig.panel              { catalogId, brandId, watt, panelType, ratePerWpInr }
--   commercialConfig.dcrComparison      { enabled, brandId, watt }
--   commercialConfig.capacityScenarios  { enabled, scenarios[], recommendedId }
--   commercialConfig.financing          { enabled, interestRatePct, tenuresYears, downPaymentInr, lenderLabel }
--   commercialConfig.orgType            hotel | hospital | factory | ...
--   commercialConfig.storyMode          executive_pitch | cfo_brief | ...
--
-- Block visibility remains in ppt_input.proposalLayout (existing).
-- Law 8: no marketplace / seller / commission fields.

COMMENT ON COLUMN public.proposals.ppt_input IS
  'Deck input JSON. Includes proposalLayout (block playlist), commercialConfig (C&I intelligence), '
  'financeOption, storyMode/storySegment, and legacy residential fields.';
