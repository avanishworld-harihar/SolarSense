# 06 — Responsive Breakpoint Audit

> Read-only inspection of responsive coverage, breakpoint conventions, and device-class issues.

## 1. Tailwind breakpoint set in use

The project uses default Tailwind breakpoints — no customization in `tailwind.config.ts`. The five breakpoint prefixes appearing in code are:

| Prefix | Min width | Device class |
|---|---|---|
| `sm:` | 640px | Large phone / small tablet |
| `md:` | 768px | iPad portrait (~768–834px) |
| `lg:` | 1024px | iPad landscape, small laptop |
| `xl:` | 1280px | Standard desktop |
| `2xl:` | 1536px | Wide desktop / ultra-wide |

No `min-h-svh` variant, no `xs:`, no custom `iPad:` query.

## 2. Per-page responsive map

Hand-survey of breakpoint coverage per route (based on the first 80 lines of imports + the route file size as a proxy for layout density):

| Route | sm | md | lg | xl | 2xl | Notes |
|---|---|---|---|---|---|---|
| `/` (Dashboard) | covered | covered | covered | covered | partial | `pageContainerClass` caps at `xl:max-w-7xl`, no 2xl bump. |
| `/customers` | covered | covered | covered | covered | partial | Same shell. |
| `/projects` | covered | covered | covered | covered | partial | Kanban board switches columns per breakpoint. |
| `/proposals` (Hub) | covered | covered | covered | covered | covered | Two-column split-pane already responsive. |
| `/proposal` (Builder) | covered | covered | **partial** | covered | partial | Live Preview Panel switch is at `lg:block` — under `lg` it's hidden, which is correct, but mode transitions at `lg` can be jarring. |
| `/proposals/[id]` (workspace placeholder) | covered | covered | covered | covered | covered | Mostly shell-only. |
| `/proposal/[id]` (public residential) | covered | covered | covered | covered | covered | Locked at A4 width (`max-w-[210mm]`). Print-first. |
| `/proposal/[id]` (public commercial) | covered | covered | covered | covered | covered | `CommercialProposalView` uses presentation-mode toggles. |
| `/more` | covered | covered | covered | covered | partial | Mostly form sections. |
| `/admin/login` | minimal | minimal | minimal | minimal | none | Single-column form. |
| `/admin/tariff-reports` | partial | partial | covered | covered | none | Heavy table; needs `md:` overflow scroll. |
| `/offline` | covered | covered | covered | covered | none | Short fallback screen. |
| `/harihar-solar/calculator` (acquisition) | covered | covered | covered | covered | partial | Public landing. |

## 3. Hotspots by frequency of responsive class usage

Top consumers of `(sm:|md:|lg:|xl:|2xl:)`:

| File | Count |
|---|---:|
| `components/acquisition/harihar/harihar-solar-calculator-client.tsx` | 58 |
| `components/proposal/blocks/commercial/block-commercial-cover.tsx` | 20 |
| `components/proposal/proposal-journey.tsx` | 19 |
| `components/dashboard-operational-insights.tsx` | 13 |
| `components/ui/button.tsx` | 2 |
| `components/proposal/proposal-quick-preview.tsx` | 6 |
| `components/workspace/workspace-page-hero.tsx` | 6 |
| `components/workspace/workspace-stagger.tsx` | 2 |
| `components/bottom-nav.tsx` | 6 |
| `components/proposals/proposal-hub-deal-list.tsx` | 3 |

## 4. Known device-class issues

### 4.1 iPad portrait (~768–1023px)

Between `md:` (≥768) and `lg:` (≥1024) is iPad portrait territory and a popular form-factor for solar EPC sales conversations. This range is **under-served** in several places:

- **Proposal builder Live Preview Panel** activates at `lg:block` (1024px+). On iPad portrait (768–1023px), the preview is hidden. Sales reps using iPad portrait will not see the preview alongside the form.
- **Proposals Hub** uses a split-pane that probably collapses to single-pane below `lg:`. Need to verify in E0 follow-up. (Not investigated in this audit; reading the deal list/preview component would confirm.)
- **Customers / Projects pages** use full-width single-column layouts below `lg:`. iPad portrait gets the same layout as phone — wastes horizontal space.

### 4.2 iPad landscape (≥1024px but with touch)

iPad landscape qualifies as `lg:` so it gets the desktop layout. BUT:

- Hover states fire incorrectly under touch.
- `MetricCard` switches off count-up animation on touch devices (`hasTouchScreen`). Other surfaces do not.
- Bottom-nav (`lg:hidden`) disappears on iPad landscape, leaving only the top nav. Top-nav is dense at this width.

### 4.3 Ultra-wide (`2xl:` 1536px+)

Outer container caps at `xl:max-w-7xl` (1280px). Above 1280px, content stops growing but the viewport keeps growing — empty space on either side. Workspace pages declare `max-w-[88rem]` (1408px) but cannot exceed 1280 because of the outer cap (see `03-spacing.md`).

### 4.4 Print

`@media print` rules live in `globals.css` (12 page-break utilities). The residential proposal is locked at `max-w-[210mm]` to match A4. The commercial proposal does NOT have a hard A4 width — it relies on browser print to scale. If a customer prints a commercial proposal, content may overflow page breaks.

## 5. Mobile-first issues

The codebase is largely mobile-first (the base styles target phones, breakpoint prefixes scale up). Specific concerns:

1. **Header on small phones (<360px width)**: `BrandLogo + DesktopTopNav + title + ThemeToggle + LanguageToggle` may overflow. The title has `truncate` and `min-w-0`, and the toggles have `shrink-0`, so it should clip safely — but the layout has not been verified under 360px.
2. **Bottom-nav has 5 routes** (Dashboard, Customers, Projects, Proposals, More) sharing horizontal space. At ≤360px each tab is ~70px wide; icon-only labels truncate. The text wraps to 2 lines on some Hindi labels.
3. **Floating mobile action FAB on commercial proposal** stacks with the bottom nav. Tap targets may overlap if the user has not scrolled past the cover.
4. **Bill upload UI** uses drag-and-drop affordances that don't trigger on touch — manual fallback paths should be verified during E5.

## 6. Coverage gaps

| Device-class / gap | Today | E-phase to fix |
|---|---|---|
| iPad portrait Live Preview | Hidden under `lg:` | E5 (workspace upgrade) — add `md:` variant. |
| Outer-cap mismatch on 2xl | 1280 vs declared 1408 | E2 (universal shell) |
| Touch motion-skip outside `MetricCard` | Inconsistent | E1 (motion tokens) |
| `2xl:` content scaling | Caps at xl | E2 (universal shell) |
| Commercial proposal print width | No lock | E12 (collaboration & engagement) or earlier hot-fix |
| Header at <360px | Not verified | E0 follow-up (manual QA) |
| Hover states on touch | Not gated | E1 (interaction tokens) |
| Bottom-nav Hindi label wrap | Visible on small phones | E8 (multilingual) |

## 7. What's already premium (preserve)

- A4-locked residential proposal `max-w-[210mm]`.
- Mobile-safe-area handling in `app-shell.tsx`.
- Print breakpoint rules in `globals.css` (12 `break-inside`/`page-break` rules). The PDF/PPT output depends on these.
- Bottom-nav + top-nav split at `lg:hidden` / `lg:flex` is correct, just needs touch-device refinements.

## 8. Recommended deltas for E1+ (input)

1. **During E2 (universal shell)**, fix the outer container cap to match `max-w-[88rem]` and add an `2xl:` variant for ultra-wide.
2. **During E5 (workspace three-pane upgrade)**, surface the Live Preview at `md:block` instead of `lg:block` so iPad portrait gets it.
3. **Add a global touch-device guard** for hover/animate effects (similar to `MetricCard`'s `hasTouchScreen` check) in the unified primitives in E1.
4. **Lock commercial-proposal print width** (`max-w-[270mm]` or `max-w-[210mm]` landscape) — schedule as a hot-fix when E1 ships its token system.
5. **Add an `xs:` breakpoint** in `tailwind.config.ts` only if explicit ≤360px coverage becomes a recurring need (don't introduce now).
6. **Do NOT** change the existing breakpoint prefixes in residential proposal sections. PDF/print fidelity depends on the current values.
