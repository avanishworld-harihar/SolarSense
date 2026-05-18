# 09 — Premium Preservation Inventory

> Read-only inspection. This is the "do not remove" list. Every E-phase from E1 onward must consult this document before touching any file mentioned here.

## 1. Why this document exists

The roadmap commits to "world-class redesign" alongside "do NOT remove or break existing good features, flows, logic, or proposal generation systems." This document records — as of 2026-05-18 — which UI elements, flows, animations, components, and lib utilities are considered already premium and therefore protected.

If a future PR proposes removing or replacing anything on this list, the PR description must include:

1. A reason the replacement is necessary.
2. The replacement's location.
3. A migration window during which both old and new coexist.

## 2. Preserve list — UI surfaces

### 2.1 App chrome

| Element | File | Why preserve |
|---|---|---|
| App header with sticky glass backdrop | `components/app-shell.tsx` | Premium feel, gradient + blur composition is consistent across the app |
| `BrandLogo` + `Sol52Wordmark` | `components/brand-logo.tsx`, `components/sol52-wordmark.tsx` | Brand identity |
| `DesktopTopNav` active state (teal underline, soft glass surface) | `components/desktop-top-nav.tsx` | Subtle premium navigation cue |
| `BottomNav` with portal mount + active pill + active gradient icon | `components/bottom-nav.tsx` | Mobile feels native |
| `ThemeToggle`, `LanguageToggle` | `components/theme-toggle.tsx`, `components/language-toggle.tsx` | First-class polyglot + theme toggling |
| Mesh-gradient background + grain texture (light) + ink underlay (dark) | `.mesh-gradient-bg` in `app/globals.css` (lines 93–147) | The signature SOL.52 backdrop |
| Light↔dark transition smoothing | `--ss-theme-duration: 250ms; --ss-theme-easing: ease-in-out` | Premium theme switch |

### 2.2 Workspace surfaces

| Element | File | Why preserve |
|---|---|---|
| `WorkspacePageHero` (eyebrow + title + subtitle + tone gradient) | `components/workspace/workspace-page-hero.tsx` | Anchor for every workspace route |
| Workspace tone gradients | `app/globals.css` lines 179–204 (`workspace-page-hero--customers/projects/proposals/settings`) | Module identity at a glance |
| `WorkspaceStaggerItem` + `workspaceStaggerVariants` | `components/workspace/workspace-stagger.tsx`, `lib/workspace-design.ts` | Entry animation for workspace pages |
| `WorkflowLifecycleStrip` | `components/workflow-lifecycle-strip.tsx` | Lead → Project lifecycle visualization, used by Customers, Projects, Proposals |

### 2.3 Dashboard surfaces

| Element | File | Why preserve |
|---|---|---|
| `DashboardCommandCenter` | `components/dashboard-command-center.tsx` | Mission-control style anchor |
| `DashboardOperationalInsights` | `components/dashboard-operational-insights.tsx` | The premium "intelligence" surface that should become the model |
| `DashboardQuickActions` | `components/dashboard-quick-actions.tsx` | Large action buttons, the "easy on the surface" pattern |
| `DashboardSectionTitle` | `components/dashboard-section-title.tsx` | Section heading rhythm |
| Tone-tinted `MetricCard` with count-up + reduced-motion + touch-skip | `components/metric-card.tsx` | The most polished individual card primitive |

### 2.4 Proposals Hub

| Element | File | Why preserve |
|---|---|---|
| Two-column split-pane structure | `app/(main)/proposals/page.tsx` | Already 80% of "mission control" — base for E3 redesign |
| `ProposalHubDealList` with status grouping | `components/proposals/proposal-hub-deal-list.tsx` | Pipeline grouping logic |
| `ProposalHubAnalyticsStrip` | `components/proposals/proposal-hub-analytics-strip.tsx` | Above-the-fold strip with motion |
| `ProposalWorkspacePreview` | `components/proposals/proposal-workspace-preview.tsx` | Right-pane mini deck preview |
| `ProposalHubIntelPanel` | `components/proposals/proposal-hub-intel-panel.tsx` | AI-style insights surface (proto) |
| `ProposalHubMobileNav` | `components/proposals/proposal-hub-mobile-nav.tsx` | Mobile pipeline navigation |
| `ProposalHubActionsSheet`, `ProposalDetailActionsSheet` | `components/proposals/proposal-hub-actions-sheet.tsx`, `proposal-detail-actions-sheet.tsx` | Bottom-sheet actions (mobile) |

### 2.5 Proposal Builder OS chrome

| Element | File | Why preserve |
|---|---|---|
| `ProposalPresetPicker` (full-screen overlay with tier cards) | `components/proposals/os/preset-picker.tsx` | The premium "choose your operating mode" moment |
| `ProposalOSHeader` | `components/proposals/os/proposal-os-header.tsx` | Builder identity bar |
| `BuilderStageBar` | `components/proposals/os/builder-stage-bar.tsx` | Multi-stage flow progress |
| `ProposalLivePreviewPanel` | `components/proposals/os/live-preview-panel.tsx` | Right-side live preview at `lg:` and above |
| `BlockPlaylistEditor` | `components/proposals/os/block-playlist-editor.tsx` | Drag-and-drop block layout |

### 2.6 Public Proposal (Residential)

| Element | File | Why preserve |
|---|---|---|
| 17 exported section components | `app/(public)/proposal/[id]/proposal-view.tsx` | Re-imported by `web-renderer.tsx`; breaking them breaks the renderer |
| `JourneyBridge` text bridges between sections | `components/proposal/proposal-journey.tsx` | Narrative pacing in the proposal |
| `ProposalJourneyProgress` (top progress bar) | same file | Engagement indicator |
| A4-locked print width `max-w-[210mm]` | `web-renderer.tsx`, `proposal-view.tsx` | Print/PDF fidelity |
| Page-break utilities | `app/globals.css` (12 rules incl. `.proposal-page`, `.proposal-document`, `.proposal-journey-connected`, `.proposal-responsive-doc`) | Print fidelity |
| Bilingual (English + Hindi) toggle | renderer + `dict()`, `monthLabels()` | First-class polyglot |
| Light/dark theme toggle on public proposal | `lib/proposal-web-theme.ts` + renderer | Customer-side preference |

### 2.7 Public Proposal (Commercial)

| Element | File | Why preserve |
|---|---|---|
| `CommercialProposalView` 10-section deck | `components/proposal/commercial-proposal-view.tsx` | The visual benchmark; touch only via shared primitives |
| Sticky dark nav with active-section tracking | same file | Boardroom-grade navigation |
| Presentation mode | same file | iPad-landscape walkthrough |
| Floating progress indicator (desktop) | same file | Scroll engagement |
| Alternating section backgrounds | `SECTION_BG` array, same file | Visual rhythm |
| All 10 commercial blocks | `components/proposal/blocks/commercial/block-*` | Premium block visuals |
| `commercial-shared.tsx` primitives (`CountUp`, `SectionReveal`, `CommercialSectionHeader`, `GlassPanel`, `DarkGlassPanel`, `KpiCard`) | `components/proposal/blocks/commercial/commercial-shared.tsx` | Shared block language |

### 2.8 Block primitives (residential side)

| Element | File | Why preserve |
|---|---|---|
| `useBlockCountUp` print-safe count-up | `components/proposal/blocks/proposal-block-utils.tsx` | Print/PDF fidelity; reduced-motion respect |
| `BlockAnimatedINR` | same file | Premium INR animation |
| `BlockStatTile`, `BlockKicker`, `BlockSectionTitle`, `BlockPanel`, `BlockMetricRow` | same file | Used by extracted residential blocks |
| `BlockExecutiveSummary`, `BlockSystemRequirements`, `BlockFinancialIntelligence`, `BlockEngineeringRationale` | `components/proposal/blocks/block-*` | Imported by `web-renderer.tsx` |

### 2.9 Public landing

| Element | File | Why preserve |
|---|---|---|
| Harihar Solar calculator client | `components/acquisition/harihar/harihar-solar-calculator-client.tsx` | Public acquisition surface (1,043 lines) |
| Animated INR component | `components/acquisition/harihar/animated-inr.tsx` | Inrement animation |
| Bill savings chart | `components/acquisition/harihar/bill-savings-chart.tsx` | Public-facing chart |
| Rooftop illustration | `components/acquisition/harihar/rooftop-illustration.tsx` | Brand illustration |

## 3. Preserve list — Animations

| Animation | File / class | Why preserve |
|---|---|---|
| Light↔dark CSS transition (250ms ease-in-out) | `--ss-theme-duration`, `--ss-theme-easing` | Premium theme transition |
| Reveal on scroll with reduced-motion gate | `MotionConfig reducedMotion="user"` in `web-renderer.tsx` | Accessibility |
| Count-up on first viewport entry | `useBlockCountUp`, `CountUp` | Engagement |
| `workspaceStaggerVariants` (stagger 0.08s, delay 0.03s, ease-out, 0.38s duration) | `lib/workspace-design.ts` | Workspace page entry |
| Bottom-nav active gradient pill + icon transition | `components/bottom-nav.tsx` | Mobile feedback |
| Active route underline on top-nav | `components/desktop-top-nav.tsx` | Desktop feedback |
| Section background alternation in commercial proposal | `SECTION_BG` in `commercial-proposal-view.tsx` | Visual rhythm |
| `whileInView` with `viewport={{ once: true }}` (consistent pattern) | many block files | Performance + correctness |

## 4. Preserve list — Proposal flows

### 4.1 Residential bill-upload flow

Already detailed in `08-proposal-flow.md` §5. **Do not break.**

### 4.2 Commercial requirement flow

`PROPOSAL_PRESET_REGISTRY["commercial_executive"].bill_requirement = "not_applicable"`. The builder must continue to allow proposal creation without bill upload. Bill-related fields are optional in this path. **Do not require bill data for commercial flow.**

### 4.3 Public proposal share + download

WhatsApp share + PPT download + Print/PDF — all three present on both residential and commercial views. **Do not regress.**

### 4.4 Pricing snapshot immutability

```typescript
// supabase/migrations/022_proposal_snapshots.sql
CREATE TABLE proposal_pricing_snapshots (...)
```

Append-only snapshot table. Inserts only. **Do not allow updates or deletes** in any future API.

### 4.5 Approval event log

```typescript
// supabase/migrations/023_proposal_approval_events.sql
CREATE TABLE proposal_approval_events (...)
```

Append-only event log. **Do not allow updates or deletes.**

### 4.6 Proposal IR compilation

`compileProposalDocument()` in `lib/proposal-document-ir.ts` must remain pure. Inputs in → ProposalDocument out. No side effects. **Do not introduce async I/O or DB writes** to this function.

## 5. Preserve list — Components / files

### 5.1 Files that may not be deleted

```
app/(public)/proposal/[id]/page.tsx                          (88 lines)
app/(public)/proposal/[id]/proposal-view.tsx                 (2,622 lines)
app/(main)/proposal/page.tsx                                 (2,413 lines)
app/(main)/proposals/page.tsx                                (298 lines)
app/(main)/page.tsx                                          (413 lines)
app/globals.css                                              (3,427 lines)

components/app-shell.tsx
components/bottom-nav.tsx
components/desktop-top-nav.tsx
components/brand-logo.tsx
components/sol52-wordmark.tsx
components/theme-toggle.tsx
components/theme-provider.tsx
components/language-toggle.tsx
components/app-providers.tsx
components/touch-optimize-bootstrap.tsx
components/offline-data-notice.tsx

components/dashboard-command-center.tsx
components/dashboard-operational-insights.tsx
components/dashboard-quick-actions.tsx
components/dashboard-greeting.tsx
components/dashboard-section-title.tsx
components/workflow-lifecycle-strip.tsx
components/metric-card.tsx

components/workspace/workspace-page.tsx
components/workspace/workspace-page-hero.tsx
components/workspace/workspace-stagger.tsx

components/proposals/proposal-hub-header.tsx
components/proposals/proposal-hub-analytics-strip.tsx
components/proposals/proposal-hub-deal-list.tsx
components/proposals/proposal-hub-intel-panel.tsx
components/proposals/proposal-hub-mobile-nav.tsx
components/proposals/proposal-hub-actions-sheet.tsx
components/proposals/proposal-workspace-preview.tsx
components/proposals/proposal-commercial-snapshot-bar.tsx
components/proposals/proposal-list-card.tsx
components/proposals/proposal-modules-strip.tsx
components/proposals/proposal-detail-section.tsx
components/proposals/proposal-detail-actions-sheet.tsx
components/proposals/proposal-manage-client.tsx
components/proposals/proposal-pricing-configurator.tsx

components/proposals/os/preset-picker.tsx
components/proposals/os/proposal-os-header.tsx
components/proposals/os/builder-stage-bar.tsx
components/proposals/os/live-preview-panel.tsx
components/proposals/os/block-playlist-editor.tsx

components/proposal/web-renderer.tsx
components/proposal/commercial-proposal-view.tsx
components/proposal/proposal-journey.tsx
components/proposal/proposal-quick-preview.tsx
components/proposal/proposal-image-uploader.tsx
components/proposal-status-badge.tsx
components/proposal-image-uploader.tsx

components/proposal/blocks/block-executive-summary.tsx
components/proposal/blocks/block-system-requirements.tsx
components/proposal/blocks/block-financial-intelligence.tsx
components/proposal/blocks/block-engineering-rationale.tsx
components/proposal/blocks/proposal-block-utils.tsx

components/proposal/blocks/commercial/commercial-shared.tsx
components/proposal/blocks/commercial/block-commercial-cover.tsx
components/proposal/blocks/commercial/block-roi-dashboard.tsx
components/proposal/blocks/commercial/block-commercial-financials.tsx
components/proposal/blocks/commercial/block-commercial-engineering.tsx
components/proposal/blocks/commercial/block-system-architecture.tsx
components/proposal/blocks/commercial/block-tiered-bom.tsx
components/proposal/blocks/commercial/block-execution-timeline.tsx
components/proposal/blocks/commercial/block-monitoring-amc.tsx
components/proposal/blocks/commercial/block-commercial-terms.tsx
components/proposal/blocks/commercial/block-premium-closing.tsx

components/customers-lead-list.tsx
components/customer-workspace-pane.tsx

components/project-kanban-board.tsx
components/project-kanban-card.tsx
components/project-pipeline-list.tsx
components/project-pipeline-accordion.tsx
components/glass-project-card.tsx

components/bill-analysis-charts.tsx
components/card-action-dots.tsx

components/ui/button.tsx
components/ui/card.tsx
components/ui/badge.tsx
components/ui/skeleton.tsx
components/ui/floating-label-input.tsx
components/ui/toast-center.tsx

components/acquisition/harihar/harihar-solar-calculator-client.tsx
components/acquisition/harihar/bill-savings-chart.tsx
components/acquisition/harihar/rooftop-illustration.tsx
components/acquisition/harihar/animated-inr.tsx
components/acquisition/platform-brand-badge.tsx
```

### 5.2 lib files that may not be deleted

```
lib/proposal-document-ir.ts
lib/proposal-block-registry.ts
lib/proposal-web-renderer-registry.ts
lib/proposal-preset-engine.ts
lib/proposal-block-context.ts
lib/proposal-template-schema.ts
lib/proposal-layout-merge.ts
lib/proposal-extras-schema.ts

lib/proposal-snapshot-store.ts
lib/proposal-approval-events.ts
lib/proposal-pricing-store.ts
lib/proposal-pricing-schema.ts
lib/proposal-pricing-merge.ts
lib/proposal-pricing-sync.ts
lib/proposal-pricing-lines.ts
lib/proposal-survey-gate.ts

lib/proposal-ppt.ts
lib/proposal-pdf.ts
lib/proposal-export.ts
lib/proposal-deck-helpers.ts
lib/proposal-status.ts
lib/proposal-i18n.ts
lib/proposal-company-resolve.ts
lib/proposal-bill-audit-eligibility.ts
lib/proposal-branding-settings.ts
lib/proposal-web-theme.ts
lib/proposal-hub-share.ts
lib/proposal-hub-dedupe.ts
lib/proposal-hub-insights.ts
lib/proposal-about-expertise.ts
lib/proposal-swr-fetchers.ts
lib/proposal-share-actions.ts

lib/proposals-store.ts
lib/solar-engine.ts
lib/tariff-engine.ts
lib/tariff-types.ts
lib/bill-parse.ts
lib/discom-billing-rules.ts
lib/mp-tariff-2025-26.ts
lib/installer-region-storage.ts
lib/customers-client.ts
lib/dashboard-stats-client.ts
lib/dashboard-trends.ts
lib/language-context.tsx
lib/roman-name-to-devanagari.ts
lib/workspace-design.ts
lib/app-nav-config.tsx
lib/platform-branding.ts
lib/performance-mode.ts
lib/lead-phone.ts
lib/lead-status.ts
lib/lead-followup-storage.ts
lib/merge-proposal-customer.ts
lib/types.ts
lib/utils.ts
lib/supabase.ts
lib/project-pipeline-stage.ts
lib/proposal-block-registry.ts (duplicate path glob; one canonical file)
```

### 5.3 Supabase migrations that may not be reverted

```
supabase/migrations/022_proposal_snapshots.sql
supabase/migrations/023_proposal_approval_events.sql
(plus any others that already shipped to production — verify before any cleanup)
```

### 5.4 Database tables that may not be dropped or schema-broken

```
proposals
proposal_pricing
proposal_pricing_snapshots
proposal_approval_events
projects (pipeline)
leads (customers)
discoms
(plus auth tables)
```

## 6. Preserve list — Storage keys & events

| Key / event | Where set | Why preserve |
|---|---|---|
| `ss_device_ref` (localStorage) | builder page line 282 | Device identity, used by save endpoints |
| `ss_bill_upload_profile_v1` (localStorage) | builder page line 291, 302 | Learned bill upload preferences per state/discom |
| `ss_proposal_session_v2` (sessionStorage) | builder page line 179, 189, 210, 1053 | In-progress proposal session |
| `PROPOSAL_BRANDING_UPDATED_EVENT` (window event) | `lib/proposal-branding-settings.ts` | Cross-tab branding sync |
| `INSTALLER_REGION_EVENT` (window event) | `lib/installer-region-storage.ts` | Cross-tab installer region sync |
| `data-ss-perf-mode` (HTML attribute) | `lib/performance-mode.ts` | Performance-mode opt-in |
| `data-proposal-theme` (HTML attribute) | `web-renderer.tsx` line 348 | Proposal route dark mode |
| `data-theme` + `data-preset` on `.proposal-document` | `web-renderer.tsx` lines 475–476 | CSS targeting for presets |

## 7. Preserve list — Routes

| Route | Purpose |
|---|---|
| `/` | Dashboard |
| `/customers` | Customers (lead pipeline) |
| `/projects` | Projects (pipeline) |
| `/proposals` | Proposals hub |
| `/proposals/[id]` | Proposal manage workspace |
| `/proposal` | Builder |
| `/proposal/[id]` | Public proposal (residential or commercial via preset) |
| `/more` | Settings / company profile |
| `/admin/login`, `/admin/tariff-reports` | Admin |
| `/harihar-solar/calculator` | Acquisition landing |
| `/offline` | PWA offline fallback |

All 32 API routes under `/api/**` are preserve-list per `08-proposal-flow.md` §4.2.

## 8. What MAY be retired (with care) — the "controlled deprecation" list

These items are duplicates or fragments that E1 should consolidate. They CAN be retired, but only after the replacement ships:

1. `components/Logo.tsx` (likely legacy duplicate of `brand-logo.tsx`).
2. Local `MetricCard` inside `harihar-solar-calculator-client.tsx` (line 714) — replace with unified `KpiTile` after E1 ships.
3. Inline 6-tone accent maps inside `block-roi-dashboard.tsx`, `block-financial-intelligence.tsx`, `block-monitoring-amc.tsx` — replace with shared accent-palette after E1 ships.
4. Inline `text-[10px] font-bold uppercase tracking-[0.2em]` eyebrows across many files — replace with shared `<Eyebrow>` after E1 ships.
5. Per-file `iconToneStyles` tables — replace with shared `<IconWell>` after E1 ships.

## 9. Operating rule

Any future PR that touches a file in §5.1, §5.2, or §5.3 MUST update this document to record the change and reason. This document is the authoritative answer to "is it safe to remove this?"
