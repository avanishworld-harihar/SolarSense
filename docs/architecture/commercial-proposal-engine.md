# Commercial Proposal Engine — Architecture (Executive Grade)

**Status:** Incremental implementation on Proposal OS  
**Law 8:** Marketplace frozen — no `seller_*`, `marketplace_*`, `commission_*`

## Problem

Two render paths exist today:

| Path | Renderer | Layout-driven |
|------|----------|---------------|
| Public `commercial_executive` | `CommercialProposalView` (10 fixed sections) | No |
| Modular `/present` + future unified | `ProposalWebRenderer` | Yes (`proposalLayout`) |

**Direction:** Unify on `proposalLayout` + `commercialConfig` JSONB over time. Short term: both paths read the same `ppt_input` fields; commercial deck gains optional sections gated by config.

## Data model (additive)

All commercial intelligence lives in **`ppt_input.commercialConfig`** (Zod: `commercialProposalConfigSchema`). No new tables required for v1; optional rate overrides can move to `proposal_pricing.line_items` later.

```ts
commercialConfig: {
  panel: { catalogId, brandId, watt, panelType, ratePerWpInr? },
  dcrComparison: { enabled, primaryCatalogId, alternateCatalogId? },
  capacityScenarios: { scenarios[], recommendedId },
  financing: { enabled, interestRatePct, tenuresYears, downPaymentInr, lenderLabel? },
  orgType?: OrgType,
  storyMode?: StoryMode,
}
```

**Block visibility** = `proposalLayout.blocks[]` (existing).  
**Commercial parameters** = `commercialConfig` (new).  
Do not duplicate toggles in both places — blocks answer “show section?”; config answers “what numbers?”.

## Panel pricing abstraction

`lib/commercial-panel-catalog.ts`

- Catalog entries: `brandId` + `watt` + `panelType` (`DCR` | `NON_DCR`) + default `ratePerWpInr`
- `resolvePanelQuote(systemKw, catalogId, overrides?)` → hardware INR, module count
- `buildDcrComparison(brandId, watt)` → side-by-side DCR vs NON-DCR delta
- Rates are **data**, not hardcoded in components — installers override `ratePerWpInr` in builder

## Capacity scenarios

`lib/commercial-capacity-scenarios.ts`

- Up to 3 scenarios (primary + alternatives)
- Metrics scaled from base `ProposalDeckSummary` (generation, cost, payback)
- `recommendedId` drives executive callout in UI

## Financing

`lib/commercial-financing.ts` wraps `computeEmi` / `buildEmiTable` from `proposal-deck-helpers.ts` with commercial defaults (tenure 5/7/10, configurable rate, down payment).

## Review layer

`ProposalReviewSheet` — single surface before generate/share:

- Reuses `ProposalModulesStrip` / layout merge for block ON/OFF + order
- Feature chips: DCR comparison, capacity scenarios, financing
- Persists `proposalLayout` + `commercialConfig` in `buildProposalExtrasPayload`

## Instant quotation

- Quick actions: `/proposal?preset=commercial_executive&orgType=hotel&kw=50`
- Extend: `panelType`, `watt`, `brand` query params (builder prefill)
- Post-generate: optional `POST /api/quotations` with `proposal_id` (future hook)

## Risks

| Risk | Mitigation |
|------|------------|
| Dual renderers diverge | Shared `commercialConfig` + shared block components |
| Layout not saved from builder | Wire `proposalLayout` in extras payload |
| Cognitive overload in builder | Commercial panel collapses to 3 accordions: Panel · Scenarios · Financing |

## Migration

`028_commercial_proposal_config.sql` — documents JSONB keys only (additive, no DDL).
