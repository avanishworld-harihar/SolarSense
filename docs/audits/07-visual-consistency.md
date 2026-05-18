# 07 — Visual Consistency Audit (Per-Screen Scorecard)

> Read-only inspection. Scores each major screen on internal coherence (Does this screen feel like one thought?) and external coherence (Does it feel like the same app as the screens beside it?).

## 1. Scoring framework

| Score | Meaning |
|---|---|
| **A** | Already premium. Preserve as-is or near-as-is. |
| **B** | Premium intent, minor inconsistencies. Polish during the relevant E-phase. |
| **C** | Visible inconsistency or busyness. Targeted fix needed. |
| **D** | Disconnected from the rest of the app. Major rework needed. |

## 2. Per-screen scores

### 2.1 Dashboard — `app/(main)/page.tsx` — Grade: **B**

**Premium aspects:**

- `DashboardCommandCenter`, `DashboardOperationalInsights`, `DashboardQuickActions`, `DashboardSectionTitle` — clearly the model for the rest of the app.
- Uses framer-motion + `useReducedMotion` correctly.
- `MetricCard` with tone-tinted icon wells looks polished.

**Friction:**

- Mixes shadcn `Card` + `CardHeader` + `CardContent` (lines 9–10 imports) with `metric-card.tsx` (its own primitive) — two different card languages.
- 91 raw Tailwind palette literals in `dashboard-operational-insights.tsx` — significant inline tone choices.
- "GlassProjectCard" mounted on the dashboard but doesn't share visual language with `metric-card`.

**Fix in phase:** E11 (Dashboard mission control) — but reuse the new primitives from E1, do not rebuild.

### 2.2 Customers — `app/(main)/customers/page.tsx` — Grade: **C**

**Premium aspects:**

- Uses `WorkspacePage`, `WorkspacePageHero`, `WorkspaceStaggerItem` — leverages the workspace design system.
- `WorkflowLifecycleStrip` provides good lifecycle context.

**Friction:**

- 720 lines for a single page with multiple modal states (`LeadModal` "none|add|edit"). The page is doing too much.
- 53 raw palette literals in `customer-workspace-pane.tsx` (the right pane).
- The modal styling uses `border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-teal-200/70` — a different focus ring than the rest of the app.
- The lead-detail right pane and the lead-list left pane look like two different design languages.

**Fix in phase:** E5 (Workspace upgrade) — split-pane unification.

### 2.3 Projects — `app/(main)/projects/page.tsx` — Grade: **C+**

**Premium aspects:**

- 540 lines is tighter than Customers despite similar feature surface.
- Uses `ProjectKanbanBoard`, `ProjectPipelineAccordion`, `ProjectPipelineList` — three view modes.
- Uses `WorkspacePage` shell.

**Friction:**

- Three view modes are useful but the toggle between them is small and easy to miss.
- `GlassProjectCard` lives in `components/` root while project-pipeline components live in `components/project-*` — fragmented file organization.
- Kanban column spacing differs from accordion row spacing — same data, two rhythms.

**Fix in phase:** E5 + E11.

### 2.4 Proposals Hub — `app/(main)/proposals/page.tsx` — Grade: **B+**

**Premium aspects:**

- Cleanest hub layout in the app at 298 lines.
- Already split-pane (Deal list + Workspace preview).
- Uses motion via `framer-motion`.
- `ProposalHubAnalyticsStrip`, `ProposalHubDealList`, `ProposalHubIntelPanel`, `ProposalWorkspacePreview` — well-decomposed.

**Friction:**

- Deal list still reads as "CRM list" (groups by status). The roadmap calls for a Kanban / Pipeline view mode. The data shape supports it (`ProposalStatus` groups), the UI doesn't expose it.
- No global empty state.
- Snapshot bar (`proposal-commercial-snapshot-bar.tsx`) is commercial-only — residential proposals show different metadata. The asymmetry is intentional but undocumented.

**Fix in phase:** E3 (Proposals Hub view-mode switcher) + E4 (Mission Control strip).

### 2.5 Proposal Builder — `app/(main)/proposal/page.tsx` — Grade: **C**

**Premium aspects:**

- Recently integrated Proposal OS UI: `ProposalPresetPicker`, `ProposalOSHeader`, `BuilderStageBar`, `ProposalLivePreviewPanel`, `BlockPlaylistEditor`.
- Conditional commercial mode banner + bill-optional hint.
- Live preview at `lg:block`.

**Friction:**

- **2,413 lines** in one page file. The builder mixes form state, SWR fetches, sessionStorage persistence, billing rules, AI parsing, preset state, OS UI state, manual customer state, and dynamic imports of charts.
- Three competing visual rhythms within the same page: workspace hero (page-level), step cards (form-level), live preview panel (sidebar-level).
- The form sections are densely packed; the page feels "busy" on first load even though the form is well-organized.
- Many `dark:` conditional classes are hand-rolled.

**Fix in phase:** E5 (Workspace three-pane upgrade) — extract form sections into block-aware composables, keep state engine intact.

### 2.6 Public Proposal — Residential — `app/(public)/proposal/[id]/proposal-view.tsx` — Grade: **B**

**Premium aspects:**

- Full motion system.
- A4-locked layout for print fidelity.
- Hindi support.
- Section-by-section narrative with `JourneyBridge` text.

**Friction:**

- 2,622 lines with 17 exported sections — the single largest visual file in the app.
- `commercial-proposal-view.tsx` and `proposal-view.tsx` look like different products even though they share the same engine.

**Fix in phase:** Preserve as-is. Schedule slow extraction during E5/E7 as new presets need sub-sections.

### 2.7 Public Proposal — Commercial — `components/proposal/commercial-proposal-view.tsx` — Grade: **A**

**Premium aspects:**

- Bespoke 10-section deck.
- Presentation mode.
- Sticky dark nav with active-section tracking.
- Floating progress indicator on desktop.
- Consistent visual language across all 10 blocks (after the Visual Polish phase).
- Alternating section backgrounds for rhythm.

**Friction:**

- Mobile FAB and bottom-nav can overlap.
- Print width is unlocked (see `06-responsive.md`).

**Fix in phase:** Preserve. Touch only in E1 (consolidated primitives) and E12 (collaboration).

### 2.8 Proposal Manage / Detail — `components/proposals/proposal-manage-client.tsx` — Grade: **B-**

**Premium aspects:**

- Action sheet (`proposal-detail-actions-sheet.tsx`) for mobile.
- Pricing configurator (`proposal-pricing-configurator.tsx`) is feature-rich.

**Friction:**

- `proposal-pricing-configurator.tsx` has **107 raw palette literals** — the densest in the codebase.
- The pricing configurator looks like a spreadsheet; the hub looks like a CRM; the public proposal looks like a deck. Three personalities for the same record.

**Fix in phase:** E5 or E10 (pricing surface refresh during subscription tier work).

### 2.9 More / Settings — `app/(main)/more/page.tsx` — Grade: **B**

**Premium aspects:**

- Uses motion via `framer-motion`.
- Branding settings, AMC, bank, site photos, EMI — feature-complete.

**Friction:**

- Floating-label inputs share styling with proposal builder, but the section grouping is looser.
- No top-level "category" navigation — settings are a long scroll.

**Fix in phase:** E2 (universal shell) + E5.

### 2.10 Admin pages — `app/admin/login`, `app/admin/tariff-reports` — Grade: **D**

**Premium aspects:**

- Functional.

**Friction:**

- Look nothing like the rest of the app. No workspace shell, no design tokens, minimal styling.
- These are clearly internal-only and have never been polished.

**Fix in phase:** Out of scope for the E1–E12 redesign. Schedule as a separate E13+ effort.

### 2.11 Acquisition / Harihar Solar Calculator — `app/(acquisition)/harihar-solar/calculator/page.tsx` — Grade: **B**

**Premium aspects:**

- Animated INR.
- Rooftop illustration.
- Bill savings chart.
- 91 (`harihar-solar-calculator-client.tsx`) palette literals — feature-dense, public-facing.

**Friction:**

- Lives in its own `(acquisition)` route group with its own design language.
- Has its own local `MetricCard` (line 714 of `harihar-solar-calculator-client.tsx`).
- Uses 55 palette literals (separate from the 91 in the page client).

**Fix in phase:** Out of main redesign scope. Keep as-is. Replace local `MetricCard` during E1.

### 2.12 Workspace placeholder — `app/(main)/proposals/[id]/page.tsx` (42 lines) — Grade: **B**

A thin shell. Effectively just routes to the manage client. Not a scoring concern.

### 2.13 Offline page — `app/offline/page.tsx` (90 lines) — Grade: **A**

Short, clean fallback for PWA. No friction.

## 3. Aggregate observations

### 3.1 Visual languages currently in the app

By rough count, the app speaks at least **five visual dialects**:

1. **Dashboard / Workspace dialect** — `MetricCard`, glass tinted surfaces, `WorkspacePageHero` tones, soft pastel accents, brand-blue text. Rooted in `app/(main)/page.tsx` and `components/workspace/`.
2. **Public residential proposal dialect** — A4-print first, light/dark toggle, narrative bridges between sections. Rooted in `proposal-view.tsx`.
3. **Public commercial proposal dialect** — Dark cover, alternating white/slate sections, large headings, McKinsey-deck typography. Rooted in `commercial-proposal-view.tsx`.
4. **Builder form dialect** — Floating-label inputs, multi-step cards, Proposal OS chrome (header + stage bar + preset picker), session-state persistence. Rooted in `app/(main)/proposal/page.tsx`.
5. **Admin dialect** — Plain HTML form styling, no workspace shell. Rooted in `app/admin/*`.

The first four are deliberate and add value. The fifth is unmaintained.

### 3.2 Inconsistencies

- **Status pills** look different on the hub vs the detail vs the public proposal (because of three implementations — see `05-components.md`).
- **Tab strips** look different on the Projects page vs the More page vs the public commercial proposal nav.
- **Eyebrow labels** vary between `text-[10px]`, `text-[11px]`, `text-xs` depending on which file authored them.
- **CTA primary button** is sometimes the `.ss-cta-primary` gradient, sometimes a flat shadcn `Button`, sometimes a tone-tinted variant.

### 3.3 Screens that already FEEL like one thought (good benchmarks)

- Public commercial proposal (consistent 10-block visual rhythm)
- Proposals Hub split-pane (clean two-column intent)
- Dashboard Command Center top section (Mission Control feel)
- Bottom-nav active state (clear visual feedback)

### 3.4 Screens that feel "busy" or "disconnected"

- Proposal builder (busy — too much state surface)
- Customer right pane (different language from list)
- Admin login (disconnected)
- Pricing configurator (different rhythm from rest of proposal flow)

## 4. Recommended deltas for E1+ (input)

1. **Score remains a baseline.** Every E1–E12 phase should re-score the screen it touches to confirm consistency improved.
2. **E1 should prioritize unifying status pills, tab strips, eyebrow labels, and CTA buttons** — these are the most-visible cross-screen inconsistencies.
3. **Keep `commercial-proposal-view.tsx` as the visual benchmark** for what "premium" means in SOL.52. Other screens should converge toward its discipline.
4. **Admin pages stay out of scope** until E13+. Do not waste budget unifying them with the workspace shell now.
