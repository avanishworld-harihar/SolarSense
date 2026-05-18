# 01 — Design Token Audit

> Read-only inspection of color, surface, radius, shadow, and theming tokens.

## 1. Token foundation (what exists today)

Token system lives in two layers.

### 1.1 CSS custom properties (`app/globals.css` :root and `.dark`)

shadcn-style HSL tokens, defined twice (light + dark):

```7:57:app/globals.css
:root {
  --background: 214 45% 97%;
  --foreground: 215 55% 18%;
  --card: 0 0% 100%;
  --primary: 204 88% 32%;
  --secondary: 210 40% 96%;
  --muted: 214 32% 93%;
  --accent: 152 55% 38%;
  --destructive: 0 84% 60%;
  --border: 214 28% 88%;
  --ring: 204 88% 40%;
  --radius: 1rem;
  --ss-theme-duration: 250ms;
  --ss-theme-easing: ease-in-out;
}

.dark {
  --background: 220 24% 6%;
  --card: 216 21% 11%;
  --primary: 166 88% 52%;
  --accent: 158 92% 50%;
  --border: 220 10% 22%;
  /* … */
}
```

**Observations:**

- The shadcn palette is **clean and consistent**. Light → deep blue + emerald accent. Dark → ink + neon teal.
- Theme transition is **already animated** (`--ss-theme-duration: 250ms`, `--ss-theme-easing: ease-in-out`) — premium touch that must be preserved.
- Radius token (`--radius: 1rem`) maps `rounded-lg` → 1rem, larger than default. This makes everything "friendlier."

### 1.2 Tailwind `theme.extend` (`tailwind.config.ts`)

Custom palettes added beyond shadcn:

```49:78:tailwind.config.ts
brand: {
  50: "#e8f4fc", 100: "#d1e8f8", 200: "#a3cef0", 300: "#5ba8e0",
  400: "#2580c8", 500: "#0d6ead", 600: "#0b5890", 700: "#094872",
  800: "#073554", 900: "#052638", 950: "#031520"
},
solar: {
  50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
  400: "#34d399", 500: "#22c55e", 600: "#16a34a", 700: "#15803d",
  800: "#166534", 900: "#14532d", 950: "#0c2817"
},
ocean: "#2bb6b4"
```

**Observations:**

- Only **two** brand palettes (`brand` deep blue, `solar` green) plus one floating accent (`ocean`).
- **No commercial-vs-residential semantic differentiation** exists at the token layer. Commercial blocks use raw `sky-`, `indigo-`, `slate-` Tailwind palettes.
- One shadow token: `boxShadow.card = "0 8px 24px rgba(11, 34, 64, 0.08)"`. Real codebase uses dozens of arbitrary `shadow-[…]` values.
- No spacing scale extension. No motion duration tokens beyond `--ss-theme-duration`.

## 2. Token bypass: where the system breaks down

### 2.1 Raw Tailwind palettes are used everywhere

Hotspots where raw palette usage is densest (count of `(bg|text|border|ring)-(slate|sky|emerald|...)-\d+` literals):

| File | Count |
|---|---:|
| `components/proposals/proposal-pricing-configurator.tsx` | 107 |
| `components/dashboard-operational-insights.tsx` | 91 |
| `components/acquisition/harihar/harihar-solar-calculator-client.tsx` | 55 |
| `components/customer-workspace-pane.tsx` | 53 |
| `components/proposal/blocks/commercial/block-system-architecture.tsx` | 50 |
| `components/proposals/proposal-list-card.tsx` | 46 |
| `components/proposal/blocks/commercial/block-premium-closing.tsx` | 40 |
| `components/proposal/blocks/commercial/block-roi-dashboard.tsx`, `block-financial-intelligence.tsx`, `block-tiered-bom.tsx` (avg) | ~35 each |
| `components/proposal-image-uploader.tsx` | 27 |

Even **dark-mode tinting** is hand-rolled per component. `metric-card.tsx` is the textbook example:

```7:20:components/metric-card.tsx
const iconToneStyles = {
  blue:
    "bg-sky-100/90 text-sky-700 ring-sky-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-teal-500/18 dark:text-teal-100 dark:ring-teal-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_24px_rgba(45,212,191,0.35)]",
  green:
    "bg-emerald-100/90 text-emerald-700 ring-emerald-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-emerald-500/18 dark:text-emerald-100 dark:ring-emerald-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_26px_rgba(52,211,153,0.38)]",
  /* … 4 more tones, each with light + dark variants … */
} as const;
```

These tone tables are **redefined per component**. `commercial-shared.tsx::KpiCard` has its own 6-tone `ACCENT_MAP`. `block-financial-intelligence.tsx`, `block-roi-dashboard.tsx`, `block-monitoring-amc.tsx` each have similar local accent maps. **No single source of truth**.

### 2.2 Inline `shadow-[...]`, `bg-[...]`, `border-[...]`

`globals.css` has 98 root-level classes (`.ss-card`, `.glass-panel-premium`, `.workspace-glass`, `.ss-step-card`, …) each carrying their own arbitrary box-shadow. Same goes for many components that prefer in-class arbitrary values:

- `shadow-[0_8px_24px_rgba(11,34,64,0.08)]` (matches the `boxShadow.card` token — but inlined)
- `shadow-[0_4px_32px_rgba(14,165,233,0.10)]` (commercial glow)
- `shadow-[0_-10px_40px_rgba(11,34,64,0.12)]` (bottom-nav)
- `shadow-[0_4px_24px_rgba(0,0,0,0.06)]` (`BlockStatTile`)
- `shadow-[0_4px_24px_rgba(15,23,42,0.06)]` (`BlockPanel`)
- `shadow-[0_10px_24px_rgba(15,92,86,0.28)]` (`ss-cta-primary`)
- many more

These are **near-duplicates of the same idea** (soft elevation 1, 2, 3) with no token name.

### 2.3 Workspace tones live in CSS, not in TS

The four workspace-page hero gradients are CSS-only:

```179:200:app/globals.css
.workspace-page-hero--customers::before { background: radial-gradient(...indigo + sky...); }
.workspace-page-hero--projects::before  { background: radial-gradient(...amber + orange...); }
.workspace-page-hero--proposals::before { background: radial-gradient(...emerald + sky...); }
.workspace-page-hero--settings::before  { background: radial-gradient(...slate...); }
```

The TS layer exposes a `WorkspacePageTone` union:

```7:8:lib/workspace-design.ts
export type WorkspacePageTone = "customers" | "projects" | "proposals" | "settings" | "workflow";
```

…but the gradient colors themselves are not in TS, so they can't be reused by smaller surfaces (cards, badges, charts).

## 3. Radius / surfaces / dark surfaces

### 3.1 Radius

- `--radius: 1rem` → `rounded-lg`, `rounded-md`, `rounded-sm` derived.
- Inline arbitrary radii are common: `rounded-[1.25rem]`, `rounded-[1.15rem]`, `rounded-[1.05rem]`, `rounded-[0.65rem]`, `rounded-[1.2rem]`, `rounded-[16px]`. These imply at least 5 secondary radius values that exist informally.

### 3.2 Glass surfaces

Six distinct "glass" utility classes co-exist in `globals.css`:

| Class | Purpose | Approximate role |
|---|---|---|
| `.workspace-glass` | Workspace hero / pane base | Strong glass for workspace pages |
| `.glass-panel-premium` | Premium card | Heavy backdrop blur + saturation |
| `.glass-panel-quiet` | Quiet card | Lighter glass |
| `.glass-surface-subtle` | Subtle surface (e.g. nav active state) | Light glass tint |
| `.glass-hero-cta` | CTA pill on hero | Glass + gradient CTA |
| Inline `bg-white/X backdrop-blur-Y` | Free-form glass everywhere else | Per-component improvisation |

The five named classes are well-curated. The sixth (inline) is improvised and increasingly dominant in newer files.

### 3.3 Dark surfaces

The commercial cover (`block-commercial-cover.tsx`) and `commercial-proposal-view.tsx` use a bespoke dark palette built from `slate-900`, `slate-950`, `bg-slate-50/70`. This is a **second dark theme** that does NOT reuse the shadcn `.dark` HSL variables. It is intentional (the commercial proposal is a dark deck), but should be tokenized so other commercial-grade surfaces (e.g. industrial proposals, future EPC mode) can adopt the same look.

## 4. Inconsistencies and duplicate patterns

| Pattern | Number of definitions found | Notes |
|---|---:|---|
| Light "premium card" elevation | 5+ inline | `shadow-[0_4px_24px_*]` variants |
| Heavy "hero" elevation | 3+ inline | `shadow-[0_8px_24px_*]` variants |
| Bottom-nav shadow | 1 | `shadow-[0_-10px_40px_*]` |
| CTA primary gradient | 2 | `.ss-cta-primary` + ad-hoc `from-brand-600 via-teal-500 to-indigo-600` inline |
| Status pill background | ~3 | `.ss-status-active`, `.ss-status-pending`, `.ss-status-done` + per-component improvisations |
| Tone map (blue/green/amber/violet/rose/teal) | 4+ | `MetricCard`, `BlockStatTile`, `KpiCard`, individual block accent maps |
| Workspace glass | 2 | `.workspace-glass` (CSS) + raw `bg-white/X backdrop-blur-Y` |

## 5. What's already premium (preserve)

- The CSS variable theme with smooth light↔dark transition (`--ss-theme-duration: 250ms`).
- The `.mesh-gradient-bg` mesh with grain texture in light mode and ink underlay in dark mode.
- The named workspace-page-hero tones — concept is right, execution just needs token consolidation.
- The named glass utilities (`workspace-glass`, `glass-panel-premium`, `glass-panel-quiet`, `glass-surface-subtle`, `glass-hero-cta`). These are the closest thing to a design system today.
- The `shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]` highlight on light surfaces — it gives the premium glass feel.

## 6. Recommended deltas for E1+ (input to E1, not action items now)

Drop these into the E1 (Design Token System) phase as the work scope:

1. **Promote inline shadow patterns to tokens.** Define `elevation.flat`, `elevation.card`, `elevation.float`, `elevation.deck`, `elevation.cta`. Replace inline `shadow-[…]` over time, but NEVER bulk-replace in the same PR.
2. **Promote the 6-tone tone map into a shared semantic palette.** One source of truth for "blue/sky/emerald/amber/violet/rose" used by KpiCard, MetricCard, BlockStatTile.
3. **Introduce semantic preset tokens.** `--preset-residential-accent`, `--preset-commercial-accent`, `--preset-industrial-accent`. Each preset overrides these on a wrapper.
4. **Move workspace-tone gradients into TS** so the same tone palette can drive headers, badges, kanban columns, charts.
5. **Define a small secondary radius scale** (`rounded-card-sm = 0.65rem`, `rounded-card = 1rem`, `rounded-card-lg = 1.2rem`, `rounded-card-xl = 1.25rem`) to retire the arbitrary radii.
6. **Document motion duration tokens** (`--motion-fast = 200ms`, `--motion-base = 350ms`, `--motion-slow = 600ms`) and migrate `duration-200`/`duration-500`/etc. references where they signify the same intent.
7. **Do NOT remove** the named `.ss-*` and `.workspace-*` classes during token introduction. They are referenced from too many places — schedule deprecation only after replacements have shipped.
