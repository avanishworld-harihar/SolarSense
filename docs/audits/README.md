# SOL.52 — Phase Zero (E0) Audit Pack

> **Status:** Read-only inspection. No code changes made.
> **Date:** 2026-05-18
> **Owner of next step:** Approve audit findings, then begin E1 (Design Token System).
> **Scope:** Pre-flight audit before the world-class redesign roadmap (E1–E12) defined in `c:\Users\AVANISH GUPTA\.cursor\plans\sol.52_os_vision_20172248.plan.md`.

---

## 1. What this audit is

This audit pack is the safety net for the upcoming SOL.52 transformation. Before any redesign touches production code, we needed a frozen, written record of:

- What design tokens actually exist (vs. what is improvised inline)
- Which UI components are genuinely premium and must be preserved
- Where the codebase has duplicate primitives that fragment the visual language
- Where responsive coverage is fragile
- Which surfaces are inconsistent across modules
- How the proposal generation system is wired together so the redesign does not accidentally break it

Every E1–E12 phase will refer back to this pack to know what is safe to touch and what is not.

## 2. What this audit is NOT

- It is **not** a redesign proposal.
- It does **not** prescribe colors, components, layouts, or new flows.
- It does **not** rewrite or modify any production code.
- It does **not** add new dependencies or build artefacts.

## 3. Reports in this pack

| # | File | Subject | One-line takeaway |
|---|------|---------|-------------------|
| 01 | [01-design-tokens.md](./01-design-tokens.md) | Color, surface, radius tokens | Token foundation exists but is bypassed everywhere via inline Tailwind palettes. |
| 02 | [02-typography.md](./02-typography.md) | Type scale + ad-hoc text sizes | Single font family, but 100+ arbitrary text sizes via `text-[…]` brackets. |
| 03 | [03-spacing.md](./03-spacing.md) | Spacing rhythm + page-shell utilities | Strong page-shell DNA, but per-block padding is inconsistent. |
| 04 | [04-motion.md](./04-motion.md) | Animation inventory | Premium motion exists in proposal blocks; rest of app is mostly static. |
| 05 | [05-components.md](./05-components.md) | Component inventory + duplicate primitives | 4 parallel implementations of "KPI/metric card"; 2 parallel block primitive libraries. |
| 06 | [06-responsive.md](./06-responsive.md) | Breakpoint coverage and risks | Mobile-first works; iPad portrait/landscape between `md:` and `lg:` is under-served. |
| 07 | [07-visual-consistency.md](./07-visual-consistency.md) | Per-screen scorecard | Dashboard, Proposals Hub, public Commercial Proposal are premium; builder is busy; admin is plain. |
| 08 | [08-proposal-flow.md](./08-proposal-flow.md) | Proposal flow preservation + dependency map | WebRenderer **imports residential sections directly from `proposal-view.tsx`** — single hard coupling that must be preserved. |
| 09 | [09-premium-preservation.md](./09-premium-preservation.md) | What is already premium | Locked list of UI surfaces, animations, flows, files that may not be removed. |
| 10 | [10-disconnection-map.md](./10-disconnection-map.md) | Overloaded systems, inconsistent screens, disconnected modules | Three god-files (`proposal-view.tsx`, builder page, `globals.css`), three disconnect zones. |

## 4. Top 10 findings (the executive summary)

1. **Token foundation is healthy but bypassed.** `tailwind.config.ts` defines a clean shadcn HSL token scheme (`--primary`, `--card`, `--ring` etc.) plus two custom palettes (`brand`, `solar`). However, virtually every screen reaches past these tokens to use raw Tailwind palettes (`sky-`, `emerald-`, `slate-`, `indigo-`, `amber-`, `rose-`, `violet-`). There is no commercial-vs-residential semantic token layer.

2. **Two parallel "block primitives" libraries exist** with overlapping but incompatible APIs:
   - `components/proposal/blocks/proposal-block-utils.tsx` → `BlockStatTile`, `BlockKicker`, `BlockSectionTitle`, `BlockPanel`, `useBlockCountUp`, `BlockAnimatedINR` (used by residential blocks)
   - `components/proposal/blocks/commercial/commercial-shared.tsx` → `KpiCard`, `CountUp`, `SectionReveal`, `GlassPanel`, `CommercialSectionHeader`, `DarkGlassPanel` (used by commercial blocks)

   Both implement the same animation idea with different signatures. A future renderer that tries to share visuals across presets will be blocked by this fork.

3. **Four parallel "metric/KPI card" implementations:**
   - `components/metric-card.tsx` (dashboard)
   - `components/proposal/blocks/proposal-block-utils.tsx::BlockStatTile` (residential proposal)
   - `components/proposal/blocks/commercial/commercial-shared.tsx::KpiCard` (commercial proposal)
   - Local `MetricCard` inside `components/acquisition/harihar/harihar-solar-calculator-client.tsx`

4. **God-files:**
   - `app/(public)/proposal/[id]/proposal-view.tsx` — **2,622 lines**, **17 exported section components**
   - `app/(main)/proposal/page.tsx` (builder) — **2,413 lines**
   - `app/globals.css` — **3,427 lines**, **98 custom class definitions**, **12 print-break utilities**

   These three files concentrate most of the visual logic and most of the risk. They are not safe to refactor wholesale.

5. **Dangerous renderer coupling.** `components/proposal/web-renderer.tsx` (the future block-loop engine) imports section components **directly from** `app/(public)/proposal/[id]/proposal-view.tsx`. The residential view is therefore a critical dependency of the commercial renderer. Anything that moves residential sections must update this import path.

6. **Builder page persists state to `sessionStorage`/`localStorage`** under hard-coded keys (`ss_proposal_session_v2`, `ss_bill_upload_profile_v1`, `ss_device_ref`). Any redesign that re-mounts the page or unmounts it during transition must keep these keys intact or migrate them.

7. **Workspace design system is partly extracted.** `lib/workspace-design.ts` defines tones (`customers | projects | proposals | settings | workflow`) and `workspaceStaggerVariants`. But only `WorkspacePageHero` and `WorkspaceStaggerItem` consume them. The dashboard and proposal-hub do not use this stagger pattern.

8. **Dark-mode pattern is `dark:` utility classes scattered everywhere.** No themed token layer for dark mode beyond shadcn HSL variables. Components hand-roll their dark counterparts. `commercial-proposal-view.tsx` uses a custom data-theme attribute instead.

9. **Preset registry is foundationally extensible** (`PROPOSAL_BLOCK_REGISTRY` + `PROPOSAL_PRESET_REGISTRY`) but only ships 2 of 14 planned presets. The block registry already declares `preset_affinity` and `requirement_path_only` flags so the expansion in E7 will be data-only — no schema work needed.

10. **Motion is concentrated in 19 files.** All commercial blocks animate richly; `proposal-view.tsx` animates richly; `(main)/page.tsx`, `(main)/more/page.tsx`, and `proposal-journey.tsx` animate. The Proposals Hub, Customers, Projects pages animate only via `WorkspaceStaggerItem`. The Builder page (2,413 lines) has almost no motion.

## 5. Quantitative snapshot

| Metric | Value | Where |
|---|---:|---|
| Total `components/**/*.tsx` files | 84 | `components/` |
| Total `app/**/page.tsx` files | 14 | `app/` |
| `globals.css` line count | 3,427 | `app/globals.css` |
| Custom CSS classes in `globals.css` | ~98 root-level rules | `app/globals.css` |
| Residential proposal view (god-file) | 2,622 lines / 17 exported sections | `app/(public)/proposal/[id]/proposal-view.tsx` |
| Builder page (god-file) | 2,413 lines | `app/(main)/proposal/page.tsx` |
| Commercial proposal view | 482 lines | `components/proposal/commercial-proposal-view.tsx` |
| Commercial blocks (count) | 10 files, 235–362 lines each | `components/proposal/blocks/commercial/` |
| Residential blocks (extracted, count) | 4 files | `components/proposal/blocks/block-*` |
| API routes | 32 | `app/api/**/route.ts` |
| Proposal-related lib files | 37 | `lib/proposal-*.ts` |
| Motion-using files | ~19 | (see `04-motion.md`) |
| Files with `whileInView` or `useInView` | 21 | (see `04-motion.md`) |

## 6. Reading order

For the strategic redesigner (Opus):

1. Start with [`08-proposal-flow.md`](./08-proposal-flow.md) — understand what cannot break.
2. Then [`09-premium-preservation.md`](./09-premium-preservation.md) — understand what cannot be removed.
3. Then [`10-disconnection-map.md`](./10-disconnection-map.md) — understand what feels wrong today.
4. Then [`05-components.md`](./05-components.md) — understand the duplication problem before E1 tokens.
5. Finally `01–04` and `06–07` for the surface inventory.

For the implementer (Sonnet):

1. Start with [`01-design-tokens.md`](./01-design-tokens.md) and [`02-typography.md`](./02-typography.md) to know what tokens to publish in E1.
2. [`05-components.md`](./05-components.md) tells you which duplicates to consolidate.
3. [`06-responsive.md`](./06-responsive.md) tells you which breakpoints to fix when touching layout.

## 7. What changes after E0

- Nothing in production code.
- Each report carries a **"Recommended deltas for E1+"** section — these are inputs to the actual phases, not actions to take now.

---

*End of audit pack index. See individual reports for detail.*
