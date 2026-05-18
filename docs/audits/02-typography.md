# 02 — Typography Audit

> Read-only inspection of font families, type scale, and font-weight usage.

## 1. Font foundation

### 1.1 Font families

```13:18:tailwind.config.ts
fontFamily: {
  sans: ["var(--font-sans)", "Montserrat", "system-ui", "sans-serif"],
  /** Same stack as sans — kept for headings that still use `font-display`. */
  display: ["var(--font-sans)", "Montserrat", "system-ui", "sans-serif"]
}
```

**Observations:**

- Single font stack across the entire app. `sans` and `display` are aliases.
- `--font-sans` is the Next.js font variable (Montserrat is set up via `next/font` somewhere in `app/layout.tsx`).
- **No Devanagari typography stack** despite the app fully supporting Hindi (`useLanguage`, `lang === "hi"` branches in 30+ files, `dict()` / `monthLabels()` returning Hindi strings, `hindiHonoredDisplayName()`).
- **No tabular numbers** font feature set at the system level. Components opt-in via `tabular-nums` class (KpiCard, BlockStatTile, `.ss-stat-value`).

### 1.2 Base font scale

```72:74:app/globals.css
html {
  font-size: 16.5px;
  letter-spacing: -0.02em;
  /* … */
}
```

- Root font size is `16.5px` (slightly larger than browser default `16px`). This shifts every `rem` Tailwind class slightly.
- Global `letter-spacing: -0.02em` (slight tightening) — applied on `html` and `body`. Premium type feel.
- `text-foreground antialiased` applied on `body` — good.

## 2. Type scale usage

### 2.1 Standard Tailwind sizes used

The codebase uses the full Tailwind scale: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`. Component counts (occurrences of `text-(xs|sm|base|lg|...)`):

| File | Count |
|---|---:|
| `components/proposals/proposal-pricing-configurator.tsx` | 30+ (heavy hotspot — see 01-design-tokens) |
| `components/proposal/blocks/commercial/block-commercial-cover.tsx` | 39 |
| `components/proposal/blocks/commercial/block-commercial-terms.tsx` | 19 |
| `components/proposal/blocks/commercial/block-roi-dashboard.tsx` | 17 |
| `components/proposal/blocks/commercial/block-commercial-financials.tsx` | 17 |
| `components/customer-workspace-pane.tsx` | 16 |

### 2.2 Arbitrary text sizes via `text-[...]`

Top consumers of `text-[\d…px|rem]` arbitrary brackets:

| File | Count of bracketed text sizes |
|---|---:|
| `components/proposals/proposal-pricing-configurator.tsx` | 22 |
| `components/proposal/blocks/commercial/block-commercial-cover.tsx` | 19 |
| `components/proposal/blocks/commercial/block-premium-closing.tsx` | 12 |
| `components/proposal/blocks/commercial/block-execution-timeline.tsx` | 9 |
| `components/proposals/os/live-preview-panel.tsx` | 9 |
| `components/proposal/blocks/commercial/block-monitoring-amc.tsx` | 7 |
| `components/bill-analysis-charts.tsx` | 22 |
| `components/acquisition/harihar/harihar-solar-calculator-client.tsx` | 16 |

Concrete arbitrary sizes that recur:

- `text-[10px]` — uppercase eyebrow labels (used in dozens of places)
- `text-[11px]` — small status / pipeline labels
- `text-[13px]` — sometimes used between `text-xs` (12px) and `text-sm` (14px)
- `text-[1.65rem]`, `text-[1.85rem]` — used for "big stat" values on the dashboard (`ss-stat-value`, `ss-card-title`)
- `text-[2.75rem]` — commercial section heading
- `text-[3.5rem]`, `text-[3.75rem]`, `text-[4.5rem]` — KPI hero numbers on the commercial cover
- `text-[0.9375rem]` — used for slightly-bigger-than-sm body copy (`.ss-card-subtitle`, `.ss-section-subline`)

Each of these recurs ≥4 times in different files. They are **de facto type tokens** that have never been named.

### 2.3 Heading hierarchy in `globals.css`

A semi-formal heading scale lives in CSS utility classes (light theme defaults):

```314:330:app/globals.css
.ss-card-title          { @apply text-lg font-bold sm:text-xl lg:text-[1.65rem] lg:leading-tight xl:text-[1.85rem]; }
.ss-card-eyebrow        { @apply text-[11px] tracking-[0.2em] sm:text-xs; }
.ss-card-subtitle       { @apply text-[0.9375rem] leading-relaxed sm:text-base; }
.ss-step-title          { @apply block text-base font-extrabold sm:text-lg; }
.ss-step-description    { @apply mt-0.5 block text-xs font-semibold leading-snug; }
```

```885:910:app/globals.css
.workspace-type-eyebrow  { @apply text-[10px] font-bold uppercase tracking-[0.24em] lg:text-[11px] xl:text-xs; }
.workspace-type-greeting { @apply font-sans text-base font-semibold lg:text-[1.35rem] xl:text-2xl; }
.workspace-type-body     { @apply font-medium lg:text-base xl:text-lg; }
.workspace-type-headline { @apply font-sans text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem] xl:text-[2.5rem]; }
.workspace-type-section  { @apply border-l-[3px] border-l-teal-500/80 pl-3 text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl; }
.workspace-type-label    { @apply text-[10px] font-bold uppercase tracking-wider lg:text-[11px] xl:text-xs; }
```

```1009:…
.workspace-type-trend    { @apply text-sm font-medium lg:text-[0.9375rem] xl:text-base; }
```

These workspace type utilities are good — **already** the closest thing to a type scale token system. They define eyebrow → label → body → trend → section → headline → greeting. The only problem is that they live only inside CSS and are not surfaced as TS tokens, so they can't be referenced by non-workspace surfaces (proposal blocks, modals, charts).

### 2.4 Letter-spacing usage

- Global: `letter-spacing: -0.02em` (slight negative)
- Heading-style negative: `tracking-tight`, `tracking-[-0.015em]`, `tracking-[-0.02em]` — used on big headings.
- Uppercase positive: `tracking-[0.18em]`, `tracking-[0.2em]`, `tracking-[0.22em]`, `tracking-[0.24em]`, `tracking-[0.28em]` — eyebrow labels. 5 distinct values for what is conceptually the same intent.

## 3. Font weight usage

The codebase uses the full Tailwind weight scale: `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-extrabold` (800), `font-black` (900). Plus `font-mono` is used in a few places for tabular feel (commercial section numbers).

**No single canonical mapping** between "weight intent" (label vs body vs heading vs hero number) and a specific weight number. Examples:

- `KpiCard` hero number uses `font-black` (900)
- `BlockStatTile` value uses `font-bold` (700)
- `MetricCard` value uses `font-extrabold` (800) (inferred from `.ss-stat-value`)
- Workspace `greeting` uses `font-semibold` (600)
- Workspace `headline` uses default Tailwind (which the class doesn't set explicitly → defers to Tailwind default 400)

This means "the biggest number on a card" can be 600, 700, 800, or 900 depending on which library produced it.

## 4. Hindi / Devanagari support

`useLanguage()` switches `lang === "en" | "hi"` throughout. Files that branch on `lang`:

- `proposal-view.tsx` (residential public)
- `web-renderer.tsx`
- All commercial blocks
- All extracted residential blocks
- `proposal-block-utils.tsx`
- `roman-name-to-devanagari.ts`
- `proposal-i18n.ts` (dictionary)

**Devanagari typography risks:**

- The font stack (`Montserrat → system-ui → sans-serif`) does NOT include any Devanagari-optimized fallback. On most Windows/macOS browsers this falls through to OS Devanagari (Nirmala UI / Devanagari Sangam MN), which renders, but with **different vertical metrics** than Latin Montserrat.
- `tracking-[0.2em]` style uppercase eyebrows look fine in Latin, but Devanagari **does not support uppercase** — and wide tracking on Devanagari ligatures looks broken. `block-utils.tsx::BlockKicker` already conditionally drops `tracking-wide uppercase` when `lang === "hi"`. Most other components do NOT do this conditional. Tracking conditionals exist in `~3` files only.
- `tracking-tight` (negative letter-spacing) can clip Devanagari diacritics. Risk is low at body sizes but visible on hero numbers.

## 5. What's already premium (preserve)

- Workspace type utility set (`.workspace-type-*`) — closest thing to a real type scale; **must** be the seed of E1's published TS tokens.
- The `tracking-[0.2em]` eyebrow language convention — visually distinctive of SOL.52.
- `tabular-nums` discipline on KpiCard / BlockStatTile / `.ss-stat-value` — financial numbers align cleanly.
- Conditional Hindi tracking in `BlockKicker` — the right pattern, just not applied everywhere.

## 6. Recommended deltas for E1+ (input)

1. **Publish a type-scale TS token file** that mirrors `.workspace-type-*` and adds preset-aware variants (e.g. `commercialHeadline`, `residentialHeadline`).
2. **Name the de facto sizes**: `tracking-[0.18em]` → `eyebrow-tight`, `tracking-[0.24em]` → `eyebrow-wide`, `text-[10px]` → `caption`, `text-[11px]` → `label`, `text-[0.9375rem]` → `body+`. Then progressively migrate.
3. **Add Devanagari fallback to the font stack** before E8 (multilingual phase). Suggested stack: `var(--font-sans), "Noto Sans Devanagari", Montserrat, system-ui, sans-serif`.
4. **Bake conditional Hindi tracking into the shared primitives** so every eyebrow/label automatically drops `uppercase` + wide tracking when `lang === "hi"`.
5. **Standardize hero-number weight** to a single token (recommended: `font-black` for premium decks, `font-extrabold` for dashboards) — currently 4 different weights are used for the same visual role.
6. **Do NOT** delete the `.ss-*` utility classes during this work — they are referenced from too many places.
