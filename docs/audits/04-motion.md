# 04 — Motion & Animation Inventory

> Read-only inspection of motion patterns, animation primitives, and reduced-motion handling.

## 1. Motion library

- `framer-motion` is the sole motion library. CSS keyframes are limited to shadcn's accordion utilities (`accordion-down`, `accordion-up`) from `tailwindcss-animate`.
- No bespoke CSS keyframes are defined for content-level motion. All hover-glow/pulse effects use Tailwind transitions or Framer Motion.

## 2. Where motion lives (file-level inventory)

`whileInView` or `useInView` are the canonical "enter on scroll" primitives. They appear in:

```
components/proposal/blocks/commercial/commercial-shared.tsx
components/proposal/blocks/commercial/block-monitoring-amc.tsx
components/proposal/blocks/commercial/block-roi-dashboard.tsx
components/proposal/blocks/commercial/block-commercial-engineering.tsx
components/proposal/blocks/commercial/block-execution-timeline.tsx
components/proposal/blocks/commercial/block-commercial-terms.tsx
components/proposal/blocks/commercial/block-premium-closing.tsx
components/proposal/blocks/commercial/block-tiered-bom.tsx
components/proposal/blocks/commercial/block-commercial-financials.tsx
components/proposal/blocks/commercial/block-system-architecture.tsx
components/proposal/blocks/block-financial-intelligence.tsx
components/proposal/blocks/block-system-requirements.tsx
components/proposal/blocks/proposal-block-utils.tsx
components/proposal/blocks/block-engineering-rationale.tsx
components/proposal/blocks/block-executive-summary.tsx
components/proposal/proposal-journey.tsx
app/(public)/proposal/[id]/proposal-view.tsx
```

`motion.div`/`motion.section`/etc. additionally appear in:

```
components/proposal/commercial-proposal-view.tsx (7 instances)
components/dashboard-command-center.tsx
components/proposals/proposal-workspace-preview.tsx
components/proposals/proposal-hub-intel-panel.tsx
components/proposals/proposal-hub-analytics-strip.tsx
components/proposals/proposal-hub-deal-list.tsx
components/proposals/os/preset-picker.tsx
components/proposals/os/builder-stage-bar.tsx
components/proposals/os/live-preview-panel.tsx
components/proposals/os/block-playlist-editor.tsx
components/workspace/workspace-stagger.tsx
app/(main)/page.tsx (dashboard)
app/(main)/more/page.tsx
```

**Pattern:** Motion is **dense in the proposal subsystem** and **sparse everywhere else**. The Customers page, Projects page, and Proposal builder body have almost no motion (only the `WorkspaceStaggerItem` wrapper for initial mount).

## 3. Reduced motion handling

`useReducedMotion`, `MotionConfig` (with `reducedMotion="user"`), and `prefers-reduced-motion` CSS checks appear in 16 files. Notably:

```469:471:components/proposal/web-renderer.tsx
<MotionConfig transition={{ duration: 0.35, ease: "easeOut" }} reducedMotion="user">
```

```60:69:components/metric-card.tsx
if (typeof window !== "undefined") {
  const perfMode = document.documentElement.getAttribute("data-ss-perf-mode");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const hasTouchScreen = (navigator.maxTouchPoints ?? 0) > 0;
  if (reduced || perfMode === "max-battery" || hasTouchScreen) {
    setAnimatedValue(countUpValue);
    /* … skip animation, jump to final value … */
  }
}
```

Three concerns surface in this audit:

1. **The proposal renderer respects `reducedMotion="user"` via `MotionConfig`** — good.
2. **`MetricCard` ALSO skips animation on touch devices** (`hasTouchScreen = navigator.maxTouchPoints > 0`). This is unique to the dashboard `MetricCard` and not applied to commercial KPI cards. On iPad, the commercial KPIs animate even though the user is "on touch." This is intentional (commercial proposal IS a presentation) but worth noting.
3. **`commercial-shared.tsx::CountUp` does NOT check `useReducedMotion`.** It uses `IntersectionObserver` and `useSpring` unconditionally. On reduced-motion devices the spring still runs (just visibly). Compare to `proposal-block-utils.tsx::useBlockCountUp`, which DOES respect `useReducedMotion`. This is one of the symptoms of the two-parallel-libraries problem.

## 4. Performance modes

A bespoke "performance mode" system exists:

```5:5:components/app-shell.tsx
import { applyPerformanceMode, readPerformanceMode } from "@/lib/performance-mode";
```

`data-ss-perf-mode` can be `"max-battery" | "smooth" | unset`. Only `MetricCard` consumes it. No other surfaces opt in. This is a hidden capability that should be either retired or expanded in E1.

## 5. Animation primitives (the de facto motion library)

### 5.1 Two count-up implementations

| Implementation | Used by | RAF-driven? | Respects `useReducedMotion`? | Print-safe? |
|---|---|---|---|---|
| `useBlockCountUp` in `proposal-block-utils.tsx` | All residential blocks + `proposal-view.tsx` | yes (rAF) | yes | yes (snaps to value on `beforeprint`) |
| `CountUp` in `commercial-shared.tsx` | All commercial blocks | yes (`useSpring`) | **no** | **no** (does not register `beforeprint` listener) |

```28:39:components/proposal/blocks/proposal-block-utils.tsx
useEffect(() => {
  const snap = () => setValue(safeTarget);
  window.addEventListener("beforeprint", snap);
  const mq = window.matchMedia("print");
  const onPrint = () => { if (mq.matches) snap(); };
  mq.addEventListener("change", onPrint);
  if (mq.matches) snap();
  return () => {
    window.removeEventListener("beforeprint", snap);
    mq.removeEventListener("change", onPrint);
  };
}, [safeTarget]);
```

The residential `useBlockCountUp` correctly snaps to final value when the user prints. The commercial `CountUp` (which is used in the commercial proposal that gets printed/exported) does not. This is a **latent print bug** if a user tries to print mid-animation.

### 5.2 Two reveal patterns

| Implementation | Easing | Distance | Used by |
|---|---|---|---|
| `BlockStatTile` (`proposal-block-utils.tsx`) | `[0.21, 1.02, 0.73, 1]` (bouncy) | `y: 14` | residential blocks |
| `SectionReveal` (`commercial-shared.tsx`) | `[0.22, 1, 0.36, 1]` (smooth) | `y: 32` | commercial blocks |
| `KpiCard` (`commercial-shared.tsx`) | `[0.22, 1, 0.36, 1]` + `scale: 0.97 → 1` | `y: 20` | commercial KPI grids |
| `workspaceStaggerVariants.item` | `"easeOut"` | `y: 12` | Customers/Projects/Proposals workspace pages |

Four different easings + distances for the same conceptual "fade in from below" motion. The intent is right (commercial = larger move, residential = smaller move, workspace = minimal), but the values are unnamed and could drift.

### 5.3 Hover / press feedback

- `hover:brightness-105 active:scale-[0.99]` — `.ss-cta-primary`
- `active:scale-[0.97]` — Bottom-nav buttons
- `whileHover={{ scale: 1.02 }}` / `whileHover={{ y: -2 }}` — sparse, used by a few hub cards

There is no consistent press/hover signature for cards.

### 5.4 Theme transition

```28:30:app/globals.css
--ss-theme-duration: 250ms;
--ss-theme-easing: ease-in-out;
```

Light↔dark transitions are smooth and consistent. **Premium touch — preserve.**

## 6. Inconsistencies and risks

| Risk | Severity | Fix when |
|---|---|---|
| Two count-up implementations with different print-safety | Medium | E1 (consolidate primitives) |
| `commercial-shared.tsx::CountUp` not respecting reduced motion | Medium | E1 |
| Workspace pages have minimal motion vs proposal pages have heavy motion → app feels disjointed | Low-Medium | E2/E5 (universal shell + workspace upgrade) |
| Performance-mode flag only consumed by `MetricCard` | Low | E1 |
| Hover/press signature absent on most cards | Low | E1 (define interaction tokens) |

## 7. What's already premium (preserve)

- `<MotionConfig reducedMotion="user">` wrapper on the WebRenderer.
- `useBlockCountUp` with print-safe behavior — the gold standard, residential-side.
- `workspaceStaggerVariants` — the right pattern at the workspace page level.
- Theme transition CSS variables — smooth dark-mode toggling.
- `IntersectionObserver` triggers in `CountUp` and `useInView` — performant, no over-rendering.

## 8. Recommended deltas for E1+ (input)

1. **Consolidate count-up primitives** into one library that:
   - Respects `useReducedMotion`.
   - Snaps to final value on `beforeprint` and on touch devices (configurable).
   - Accepts either spring or duration-based easing.
2. **Consolidate reveal primitives**: one `Reveal` component with `density="sm" | "md" | "lg"` props mapping to the 3 distances currently used (`y: 12 / 20 / 32`).
3. **Define motion duration tokens**: `--motion-fast = 200ms`, `--motion-base = 350ms`, `--motion-slow = 600ms`, `--motion-deck = 1.4s` (count-up).
4. **Define a standard hover signature for cards** (`hover:-translate-y-0.5` or `whileHover={{ y: -2 }}`) and apply during E3/E4.
5. **Expand performance-mode consumption** beyond `MetricCard` during E1.
6. **Do NOT** remove the WebRenderer `MotionConfig` wrapper — it is the only thing keeping reduced-motion users from receiving aggressive proposal animations.
