# 05 — Reusable Component Inventory & Duplicates

> Read-only inspection. Lists every reusable component file and flags duplicate primitives that must be consolidated in E1.

## 1. Component layout summary

84 files under `components/**/*.tsx`.

### 1.1 Component groups

| Group | Location | File count | Role |
|---|---|---:|---|
| App chrome | `components/{app-shell, bottom-nav, desktop-top-nav, brand-logo, sol52-wordmark, language-toggle, theme-toggle, app-providers}.tsx` | 8 | Shell, navigation, branding, theme/lang toggles |
| Dashboard | `components/{dashboard-greeting, dashboard-command-center, dashboard-operational-insights, dashboard-quick-actions, dashboard-section-title, workflow-lifecycle-strip}.tsx` | 6 | Dashboard surfaces |
| Workspace primitives | `components/workspace/{workspace-page, workspace-page-hero, workspace-stagger}.tsx` | 3 | Workspace page hero, page wrapper, stagger animation |
| Customer module | `components/{customers-lead-list, customer-workspace-pane}.tsx` | 2 | Customer list + workspace pane |
| Project module | `components/{project-kanban-board, project-kanban-card, project-pipeline-accordion, project-pipeline-list, glass-project-card}.tsx` | 5 | Kanban + accordion + glass card |
| Proposal hub | `components/proposals/{proposal-hub-header, proposal-hub-analytics-strip, proposal-hub-deal-list, proposal-hub-intel-panel, proposal-hub-mobile-nav, proposal-hub-actions-sheet, proposal-modules-strip, proposal-workspace-preview, proposal-commercial-snapshot-bar, proposal-list-card, proposal-detail-section, proposal-detail-actions-sheet, proposal-manage-client, proposal-pricing-configurator}.tsx` | 14 | Hub list, snapshot bar, mobile nav, sheets, manage client |
| Proposal OS (builder UI) | `components/proposals/os/{preset-picker, proposal-os-header, builder-stage-bar, live-preview-panel, block-playlist-editor}.tsx` | 5 | Preset overlay, builder stages, live preview, playlist editor |
| Proposal renderer (commercial) | `components/proposal/blocks/commercial/{commercial-shared, block-commercial-cover, block-roi-dashboard, block-commercial-financials, block-commercial-engineering, block-system-architecture, block-tiered-bom, block-execution-timeline, block-monitoring-amc, block-commercial-terms, block-premium-closing}.tsx` | 11 | Commercial proposal section blocks + shared primitives |
| Proposal renderer (residential, extracted) | `components/proposal/blocks/{block-executive-summary, block-system-requirements, block-financial-intelligence, block-engineering-rationale, proposal-block-utils}.tsx` | 5 | Residential commercial-affinity blocks + residential block primitives |
| Proposal renderer (shell) | `components/proposal/{web-renderer, commercial-proposal-view, proposal-journey, proposal-quick-preview, proposal-image-uploader}.tsx`, `components/proposal-image-uploader.tsx`, `components/proposal-status-badge.tsx` | 7 | WebRenderer engine, commercial container, journey progress, quick preview, image uploader |
| Acquisition (Harihar landing) | `components/acquisition/harihar/{harihar-solar-calculator-client, bill-savings-chart, rooftop-illustration, animated-inr}.tsx`, `components/acquisition/platform-brand-badge.tsx` | 5 | Public landing page calculator |
| Misc utilities | `components/{metric-card, brand-logo, card-action-dots, theme-provider, touch-optimize-bootstrap, offline-data-notice, bill-analysis-charts, sol52-wordmark, Logo}.tsx` | 9 | Cross-cutting bits |
| shadcn primitives | `components/ui/{button, card, badge, skeleton, floating-label-input, toast-center}.tsx` | 6 | shadcn-style primitives |

### 1.2 Empty / questionable

- `components/proposal/proposal-journey.tsx` AND `components/proposals/proposal-hub-deal-list.tsx`/etc. — the path casing is mixed (`proposal/` vs `proposals/`). Both folders exist. Some files appear duplicated in glob results because of forward-slash vs backslash differences on Windows; the file system has only one canonical path each.
- `Logo.tsx` (`components/Logo.tsx`) coexists with `brand-logo.tsx` and `sol52-wordmark.tsx`. Three branding files — only `brand-logo.tsx` and `sol52-wordmark.tsx` are referenced in chrome.

## 2. Duplicate primitives — the consolidation backlog for E1

### 2.1 KPI / Metric cards — **4 implementations**

| # | File | Export | Used by | Style |
|---|---|---|---|---|
| 1 | `components/metric-card.tsx` | `MetricCard` (named) | Dashboard | Soft tone-tinted icon well, count-up, light glass |
| 2 | `components/proposal/blocks/proposal-block-utils.tsx` | `BlockStatTile` (named) | Residential proposal blocks | Light + dark variants, count-up via `useBlockCountUp` |
| 3 | `components/proposal/blocks/commercial/commercial-shared.tsx` | `KpiCard` (named) | Commercial proposal blocks | Gradient tone bg + 6 accent palettes, larger numbers |
| 4 | `components/acquisition/harihar/harihar-solar-calculator-client.tsx` | `MetricCard` (local function, line 714) | Harihar landing only | Inline copy of `MetricCard` styling |

**Verdict:** all four implement the same idea: label + big number + optional icon + optional accent. They have incompatible signatures and inconsistent behaviors (some have count-up, some do not; some respect reduced motion, some do not).

**Risk if left untouched:** Every new preset (Hospital, School, Industrial CAPEX) will tempt the author to add a fifth implementation tuned to that preset. Visual fragmentation compounds.

### 2.2 Section headers — **3 implementations**

| # | File | Export | Used by |
|---|---|---|---|
| 1 | `app/(public)/proposal/[id]/proposal-view.tsx` (line 326) | `SectionHeader` (named) | Residential proposal sections (in-file callers) |
| 2 | `components/proposal/blocks/proposal-block-utils.tsx` | `BlockSectionTitle` (named) | Residential extracted blocks (`block-executive-summary`, `block-system-requirements`, etc.) |
| 3 | `components/proposal/blocks/commercial/commercial-shared.tsx` | `CommercialSectionHeader` (named) | All commercial blocks |

All three render: small label + title + optional subtitle. APIs differ:

- `SectionHeader` takes `lang`, `darkMode`, no number.
- `BlockSectionTitle` takes `kicker`, `title`, `subtitle`, `dark`, `lang`.
- `CommercialSectionHeader` takes `num` (e.g. `"01"`), `label`, `title`, `subtitle`.

### 2.3 Panel / card shells — **4 implementations**

| # | File | Export | Notes |
|---|---|---|---|
| 1 | `components/ui/card.tsx` | `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription` | shadcn-style. Used in dashboard + projects only. |
| 2 | `components/proposal/blocks/proposal-block-utils.tsx` | `BlockPanel` | Used by residential proposal blocks |
| 3 | `components/proposal/blocks/commercial/commercial-shared.tsx` | `GlassPanel`, `DarkGlassPanel` | Used by commercial proposal blocks |
| 4 | CSS-only: `.ss-card`, `.ss-card-subtle`, `.glass-panel-premium`, `.glass-panel-quiet`, `.workspace-glass` | utility classes | Used by builder, hub, customers, projects |

### 2.4 Section bridges / dividers — **2 implementations**

- `components/proposal/proposal-journey.tsx::JourneyBridge` — bridge text between residential proposal blocks.
- Commercial proposal uses **no bridge** — sections separate by background alternation instead.

This is intentional but creates an asymmetry between the two flavors of proposal. A future preset (e.g. Industrial CAPEX) may want either, and there is no single primitive for that decision.

### 2.5 Eyebrow / kicker labels — **3 implementations**

- `BlockKicker` (`proposal-block-utils.tsx`) — conditional Hindi tracking.
- `.ss-step-chip`, `.workspace-type-eyebrow`, `.ss-card-eyebrow` — CSS utility classes.
- Inline `text-[10px] font-bold uppercase tracking-[0.2em]` — repeated in 30+ files.

### 2.6 Status badges — **2 implementations**

- `components/proposal-status-badge.tsx` (in `components/` root, used by hub).
- `components/ui/badge.tsx` (shadcn-style, used by general UI).

Different APIs, slightly different shape, slightly different defaults.

### 2.7 Loading skeletons

`components/ui/skeleton.tsx` is the canonical primitive. **No duplicates** found — this is a clean primitive that is reused consistently. (Good.)

## 3. Component file size hotspots

Files ≥ 350 lines (refactor risk if redesigned without slicing first):

| File | Lines |
|---|---:|
| `components/proposal/web-renderer.tsx` | 517 |
| `components/proposal/commercial-proposal-view.tsx` | 482 |
| `components/proposal/blocks/commercial/block-tiered-bom.tsx` | 362 |
| `components/proposal/blocks/commercial/block-execution-timeline.tsx` | 318 |
| `components/proposal/blocks/commercial/block-commercial-terms.tsx` | 301 |
| `components/proposal/blocks/commercial/block-roi-dashboard.tsx` | 294 |
| `components/proposal/blocks/commercial/block-commercial-cover.tsx` | 291 |
| `components/proposal/blocks/commercial/block-system-architecture.tsx` | 275 |
| `components/proposal/blocks/commercial/block-premium-closing.tsx` | 266 |
| `components/proposal/blocks/commercial/block-commercial-financials.tsx` | 257 |
| `components/proposal/blocks/commercial/block-monitoring-amc.tsx` | 235 |

These commercial blocks are sized appropriately (~250–360 lines each). They are NOT god-files. The god-files are in `app/`, not `components/`.

## 4. Components used only in one place (potential dead code)

A rough scan suggests every reusable component IS used somewhere. No obvious dead components. But two flags:

- `components/Logo.tsx` — duplicate of `brand-logo.tsx`? Probably retained for legacy import paths.
- `components/proposal-image-uploader.tsx` AND `components/proposal/proposal-image-uploader.tsx` could be duplicates depending on filesystem casing; Windows reports both paths because of `\` vs `/`. Verify before any cleanup.

## 5. Reusability gaps (things that SHOULD be components but are inline)

| Pattern | Currently inlined in | Should be |
|---|---|---|
| "Big number + label + sub" KPI tile | 4 implementations across MetricCard / BlockStatTile / KpiCard / Harihar local | 1 polymorphic `KpiTile` with `density`, `variant` props |
| "Section number · rule · label" header | `CommercialSectionHeader` only — but is used 10× across commercial blocks | Already extracted ✓ — just need to merge with `BlockSectionTitle` |
| "Tone-tinted icon well" | `metric-card.tsx::iconToneStyles`, inline `.ws-icon-well--{tone}` rules in `globals.css` (~10 tones) | 1 `IconWell` component with tone prop |
| "Sticky action FAB / floating jump bar" | Inline in `commercial-proposal-view.tsx` (mobile nav FAB), inline in `web-renderer.tsx` (sticky bottom action bar) | 1 `MobileActionDock` primitive |
| "Animated INR" | `block-utils.tsx::BlockAnimatedINR`, `components/acquisition/harihar/animated-inr.tsx` (likely a second impl), inline `Intl.NumberFormat(…INR…)` in many places | 1 `AnimatedINR` with print-safe behavior |
| "Tab strip" | Inline in `.ss-tab-row`, `.ss-tab-chip`, `.ss-tab-chip-active`, `.ss-tab-chip-inactive`. Used by `(main)/projects/page.tsx`, `(main)/more/page.tsx`. | 1 `TabStrip` component |
| "Pipeline-stage pill" / "Lifecycle pill" | `WorkflowLifecycleStrip` is the start of this, but inline copies live in projects + customers pages | Generalize `WorkflowLifecycleStrip` |

## 6. What's already premium (preserve)

- `components/proposal/blocks/commercial/*` — 10 blocks of consistent visual quality. These ARE the premium DNA of the commercial proposal.
- `components/proposals/os/*` (5 files) — the builder UI components for preset picker, stage bar, live preview, block playlist. Already premium.
- `components/workspace/*` (3 files) — clean workspace primitives.
- `components/ui/floating-label-input.tsx` — the floating-label input. Used in 9 places. Solid primitive.
- `components/ui/toast-center.tsx` — central toast system.
- `components/proposal/web-renderer.tsx` — block-loop engine. Architecturally premium even if its imports are coupled (see 08-proposal-flow.md).

## 7. Recommended deltas for E1 (input)

1. **E1 deliverable: one unified primitives file** (`components/design-system/*` or `lib/design-system.ts`) that publishes:
   - `KpiTile` (replaces MetricCard, BlockStatTile, KpiCard, Harihar local)
   - `SectionHeader` (replaces SectionHeader, BlockSectionTitle, CommercialSectionHeader; supports `density: "residential" | "commercial"`)
   - `Panel` (replaces BlockPanel, GlassPanel, DarkGlassPanel; supports `tone: "light" | "dark"`, `glow: bool`)
   - `Eyebrow` (replaces BlockKicker + inline patterns)
   - `IconWell` (replaces inline `.ws-icon-well--*` and `iconToneStyles`)
   - `AnimatedINR` (replaces BlockAnimatedINR + Harihar variant)
   - `Reveal` (replaces SectionReveal + BlockStatTile motion wrapper + KpiCard motion wrapper)
   - `CountUp` (consolidates `useBlockCountUp` + commercial `CountUp`, with print-safe + reduced-motion handling)
2. **Do NOT delete the old primitives in E1.** Republish them as **thin wrappers** that proxy to the new system. This keeps the WebRenderer working while migration happens.
3. **Mark `harihar-solar-calculator-client.tsx` for refactor in E1** to consume the unified `KpiTile` instead of its local `MetricCard`.
4. **Audit casing duplicates** (e.g. `proposal-journey.tsx`) before any rename in E1.
5. **Do NOT** consolidate `web-renderer.tsx` or `commercial-proposal-view.tsx` — they are stable orchestrators, not primitives.
