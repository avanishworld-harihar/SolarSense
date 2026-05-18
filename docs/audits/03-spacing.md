# 03 — Spacing & Layout Audit

> Read-only inspection of spacing rhythm, page shells, container widths, and padding conventions.

## 1. Page-shell layer (what exists today)

### 1.1 `.ss-page-shell` — the global content shell

```150:152:app/globals.css
.ss-page-shell {
  @apply page-lite-sequence space-y-5 sm:space-y-6 md:space-y-7;
}
```

`space-y-5 → space-y-7` is the canonical vertical rhythm between major page sections.

### 1.2 `.workspace-page` — the workspace shell

```157:159:app/globals.css
.workspace-page {
  @apply relative mx-auto w-full min-w-0 max-w-[88rem] space-y-6 sm:space-y-7 md:space-y-8;
}
```

`max-w-[88rem]` (=1408px) is the **canonical workspace content cap**. `space-y-6/7/8` is a tighter, more confident rhythm than `ss-page-shell`.

### 1.3 `pageContainerClass()` — the chrome shell

```12:17:components/app-shell.tsx
export function pageContainerClass(extra?: string) {
  return cn(
    "mx-auto w-full max-w-full px-3 sm:px-4 md:px-5 lg:max-w-6xl lg:px-6 xl:max-w-7xl 2xl:px-8",
    extra
  );
}
```

This is the **outer** container used by `AppShell` (the header + main content frame). It caps content at:

- mobile: full-width with 0.75rem/1rem/1.25rem horizontal padding (`px-3 sm:px-4 md:px-5`)
- lg (≥1024px): `max-w-6xl = 72rem = 1152px`, padding `px-6`
- xl (≥1280px): `max-w-7xl = 80rem = 1280px`
- 2xl (≥1536px): keeps `7xl`, just bumps padding to `2xl:px-8`

### 1.4 Two competing container widths

| Container | Max width | Used by |
|---|---|---|
| `pageContainerClass()` (app-shell) | `lg:max-w-6xl xl:max-w-7xl` (≤1280px) | Header + main content of every `(main)/*` route |
| `.workspace-page` | `max-w-[88rem]` (1408px) | Workspace pages (Customers, Projects, Proposals, Proposal builder, More) |

**Issue:** The workspace pages live INSIDE the app-shell, so they're already clipped to `xl:max-w-7xl = 1280px` by the outer container. The `max-w-[88rem] = 1408px` declared on `.workspace-page` is **never reached** on ultra-wide displays. This is a latent issue for E2 (universal shell) when the rail/sidebar is introduced.

## 2. Vertical rhythm tokens

The codebase has **three implicit vertical rhythm scales**:

| Use case | Scale | Source |
|---|---|---|
| Section-to-section on a page | `space-y-5 → space-y-7` | `.ss-page-shell` |
| Workspace section-to-section | `space-y-6 → space-y-8` | `.workspace-page` |
| Card internal `space-y` | `space-y-3 → space-y-5` | Inline, varies |
| Workspace-hero internal `gap` | `gap-4` (`sm:flex-row sm:items-end`) | `WorkspacePageHero` |
| Commercial block `mb-12` between header and body | inline | `CommercialSectionHeader` |
| Proposal block `mb-6 sm:mb-8` between header and body | inline | `BlockSectionTitle` |

So the same conceptual "space below a section title" is `mb-6 sm:mb-8` in residential blocks and `mb-12` in commercial blocks. This is intentional pacing (commercial = bigger pauses) but undocumented and could drift over time.

## 3. Padding rhythm (cards, panels, sections)

### 3.1 Card padding hotspots

| Pattern | Where |
|---|---|
| `p-4 sm:p-5` | `BlockStatTile`, `BlockPanel` (when small) |
| `p-5 sm:p-6` | `WorkspacePageHero` (`p-5 sm:p-6 md:p-7`), `BlockPanel` (when bigger) |
| `p-6 sm:p-7 md:p-8` | Commercial block internal panels (improvised) |
| `p-3 sm:p-4` | Quiet cards (`.ss-page-backdrop`, mini-grids) |
| `p-3.5` | `.ss-card-stat-tile`, hotkey: arbitrary |
| `p-1`, `p-1.5` | Pill containers, segment switchers (improvised) |

The pattern is "double the smaller breakpoint." Inconsistencies arise where commercial blocks use `p-6` (`KpiCard`) without a `sm:` variant — so on mobile they get the same padding as on desktop, which looks heavy.

### 3.2 Sticky / fixed elements: safe-area allowances

```62:65:components/app-shell.tsx
"pb-[max(6.75rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] lg:pb-0 lg:pt-6"
```

The main content area reserves bottom padding for the fixed bottom nav (lg:hidden) using `env(safe-area-inset-bottom)`. This is correct mobile practice and **must not be lost** in any redesign that changes the main shell.

### 3.3 Header height

The sticky header uses `py-4` and the inner content sets its own gaps with `gap-4 sm:gap-5 lg:gap-6 xl:gap-8`. There is no single "header height" token. Anything that wants to align with the header (sticky panels, drawers) hard-codes the offset.

## 4. Grid / flex layout patterns

### 4.1 Workspace split-pane (Proposals Hub, Customers, Projects)

The Proposals Hub already uses a deliberate two-column layout on desktop with a left deal list and a right workspace preview. The hub page is short (298 lines) precisely because the heavy lifting lives in `ProposalHubDealList`, `ProposalWorkspacePreview`, `ProposalHubAnalyticsStrip`. This is the **healthiest layout pattern** in the codebase and is the natural starting point for E3.

### 4.2 KPI grids

- Dashboard top metrics: 2 columns on mobile → 4 on lg (inferred from `metric-card.tsx` consumers).
- Commercial ROI KPI banner: 3-up grid via `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6` in `block-roi-dashboard.tsx`. 6-up at lg+ is visually dense.
- Premium closing block uses 2×2 KPI grid.

The grid logic is hand-rolled in every block, never extracted.

### 4.3 Proposal page width

The public residential proposal renders **inside** a print-friendly width:

```472:474:components/proposal/web-renderer.tsx
className={`proposal-document proposal-journey-connected proposal-responsive-doc mx-auto w-full max-w-[210mm] px-4 pb-32 pt-6 sm:px-8 sm:pt-10 print:max-w-none print:p-0 print:pb-0 …`}
```

`max-w-[210mm]` (=210mm ≈ 794px) is A4 width — the renderer is designed for printable parity. This is **intentional and must be preserved**, otherwise the printed PDF/PPT will reflow differently from the web preview.

Commercial proposal is wider (`max-w-7xl` ish, inferred from `commercial-proposal-view.tsx` shell). This intentional asymmetry is correct (residential = personal document, commercial = executive deck).

## 5. Gap usage

Gaps follow Tailwind defaults:

- `gap-1.5`, `gap-2` — pill / chip groups
- `gap-3`, `gap-4` — card internal rows
- `gap-5`, `gap-6` — section internal rows
- `gap-1.5 sm:gap-2` and `gap-2 sm:gap-3` — responsive bumps

No anomalies. The spacing for gaps is one of the more consistent areas of the codebase.

## 6. Inconsistencies and risks

1. **Two container caps** (`lg:max-w-7xl` outer vs `max-w-[88rem]` inner). On ultra-wide displays, the inner cap is unreachable. Could be confusing to a redesigner who assumes 88rem is achievable.
2. **No card-padding token**. `p-4`, `p-5`, `p-6` are used per file with no documented rule for when to use which.
3. **`space-y-*` between sections is conventionally `space-y-5/6/7/8`** but the actual jump from one major section to the next varies by file. Residential proposal sections use `mb-6 sm:mb-8`; commercial blocks use `mb-12`; some proposal hub strips use `mt-4` only.
4. **Print breakpoint logic is centralized in `globals.css`** (12 `break-inside`/`page-break` rules). This is the **only** print-safety net for the residential proposal — if the renderer or block extraction touches these classnames (`.proposal-page`, `.proposal-document`, `.proposal-journey-connected`), the PDF output will silently break.

## 7. What's already premium (preserve)

- The two-tier shell pattern (`.ss-page-shell` + `.workspace-page`) — the rhythm IS premium, it just needs naming.
- Mobile safe-area handling for sticky bottom nav.
- A4-locked residential proposal width — print fidelity.
- `WorkspacePageHero` `p-5 sm:p-6 md:p-7` — progressive padding bump is the right pattern.

## 8. Recommended deltas for E1+ (input)

1. **Name three card-padding tokens** — `pad-card-sm` (`p-4 sm:p-5`), `pad-card` (`p-5 sm:p-6`), `pad-card-lg` (`p-6 sm:p-7 md:p-8`).
2. **Name three section-spacing tokens** — `gap-section-sm`, `gap-section`, `gap-section-lg` mapping to `space-y-5/6/7/8`.
3. **Reconcile the two container caps** during E2 — likely by widening `pageContainerClass` to `xl:max-w-[88rem]`.
4. **Lock the proposal print classnames** (`.proposal-page`, `.proposal-document`, `.proposal-journey-connected`, `.proposal-responsive-doc`) into the preserve inventory.
5. **Add a `space-y-block` token** for the inter-block rhythm on the commercial proposal (currently `mb-12`).
6. **Do NOT** remove the `.ss-page-shell` and `.workspace-page` classes during redesign — they are the foundation. Token-ize them, don't replace them.
