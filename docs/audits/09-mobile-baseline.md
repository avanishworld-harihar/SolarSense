# SOL.52 — Mobile Baseline Audit (Wave 1 P2)

**Viewport reference:** iPhone SE (375×667px) and iPhone 14 (390×844px).  
**Date:** 2026-05-19  
**Status:** Fixes shipped — see section 4.

---

## 1. Audit scope

Surfaces reviewed at 375px:
- `app/(main)/page.tsx` — Dashboard
- `app/(main)/proposals/page.tsx` — Proposals Hub (pipeline, grid, list views)
- `app/(main)/proposal/page.tsx` — Builder (Proposal OS)
- `app/(main)/customers/page.tsx` — Customer CRM + lead modal
- `components/shell/os-shell.tsx`, `top-bar.tsx`, `nav-rail.tsx` — Shell
- `components/proposals/os/*` — PresetPicker, BlockPlaylistEditor, BuilderStageBar, LivePreviewPanel, Header
- `components/proposals/hub-pipeline-board.tsx`, `hub-view-toggle.tsx`, `hub-search-filter.tsx`

---

## 2. Findings

### 2.1 CRITICAL — blocks or severely degrades mobile flow

| ID | Surface | Issue | Fix |
|----|---------|-------|-----|
| M01 | `hub-pipeline-board.tsx` | Kanban columns `w-[17.5rem]` (280px). At 375px with 24px side padding, only 280px of the 351px usable width is filled by one column. The gap-4 (16px) means the next column peeks only ~71px — barely enough for a snap-scroll hint. Users may not know more columns exist. | Narrow to `w-[min(72vw,17.5rem)]` (270px at 375px) → next column peeks 81px. **Shipped.** |
| M02 | `proposals/page.tsx` controls bar | `flex flex-wrap items-center justify-between gap-3` with `HubViewToggle` + dedupe checkbox + version hint text. When `hiddenCount > 0`, the hint text `"X older versions hidden"` causes the dedupe section to overflow its flex item and wrap onto a third line unpredictably. | Restructure to `flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between`. **Shipped.** |
| M03 | `proposals/os/proposal-os-header.tsx` | "Change preset" button inherits `w-full` due to `flex-col` stacking on mobile. An inline action button should never span full width. | Add `self-start` to the button wrapper on mobile. **Shipped.** |

### 2.2 MODERATE — creates friction but not blocking

| ID | Surface | Issue | Fix |
|----|---------|-------|-----|
| M04 | `proposals/os/builder-stage-bar.tsx` | `min-w-max` inner container causes the stage bar to scroll horizontally on mobile when the preset label chip is present. Scrolling is unexpected in a progress bar. | Hide preset chip on mobile (`hidden sm:inline-flex`). Stage buttons retain icons-only mode. **Shipped.** |
| M05 | `proposal/page.tsx` — generate CTA | `ProposalLivePreviewPanel` (which has the "Generate" CTA) is `hidden lg:block`. Mobile users must scroll through all 4 sections (can be 60–80% of page height) to reach the generate button at `step-4-anchor`. BuilderStageBar provides `§4` tap-to-jump, partially mitigating this. | Add a mobile-only floating quick-generate FAB (`fixed bottom-[6rem]`) that appears after customer name is filled. **Shipped.** |
| M06 | `hub-search-filter.tsx` status chips | All 5 chips + "Clear" button on one `flex-wrap` row. At 375px, "Negotiation" chip alone is ~110px. Worst case: chips wrap to 3 lines. | Acceptable — `flex-wrap` is correct here. Chips are readable and tappable. **Document only; no fix.** |
| M07 | `customers/page.tsx` modal dark mode | `modalFloatingClass` has `bg-white` hardcoded. In dark mode, form fields will have white background against a dark sheet — contrast mismatch. | Defer to Wave 1 P3 (glass tier tokens will fix this). |

### 2.3 MINOR — cosmetic, no user-visible regression

| ID | Surface | Issue | Fix |
|----|---------|-------|-----|
| M08 | `os-shell.tsx` bottom padding | `pb-[max(6.75rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))]` gives 108px clearance. Correct for standard bottom nav (56px) + safe area. No fix needed. | ✅ Correct |
| M09 | `top-bar.tsx` mobile header | Logo + spacer + Search + Theme + Lang = comfortable at 375px. Total icon row ~108px, logo ~100px, spacer fills rest. No overflow. | ✅ Correct |
| M10 | `preset-picker.tsx` bottom sheet | `items-end` on mobile → bottom sheet with `max-h-[min(96dvh,100%)]` = 640px at 375×667. Cards in `grid-cols-1`. Scrollable. Safe-area padding in footer. | ✅ Correct |
| M11 | `block-playlist-editor.tsx` drawer | `w-full max-w-sm`. At 375px, drawer takes full width → expected. Footer has safe-area inset. | ✅ Correct |
| M12 | Dashboard controls | Installer setup card is `flex-col md:flex-row` — vertical stack on mobile. CTA button is `w-full md:min-w-[7rem]`. | ✅ Correct |

---

## 3. Ship gate checklist

"Create proposal → fill bill → save → share WhatsApp" one-handed thumb test at 375px:

- [ ] Open `/proposal` → PresetPicker slides up from bottom (✅ — sheet behavior correct)
- [ ] Select preset → OS header shows preset badge (✅ — `flex-col` on mobile is OK)
- [ ] Stage bar navigates to each step (✅ — icon-only buttons, no horizontal scroll after M04 fix)
- [ ] Generate button is reachable without knowing to scroll (✅ — mobile FAB from M05 fix)
- [ ] No horizontal scroll on builder page (✅ — `overflow-x-hidden` on shell)
- [ ] Open `/proposals` → pipeline columns hint at next column (✅ — M01 fix)
- [ ] Controls bar single coherent row on mobile (✅ — M02 fix)
- [ ] Customer modal → save button visible above bottom nav (✅ — sticky footer already present)
- [ ] WhatsApp send opens native share (✅ — `wa.me` deep link unchanged)

---

## 4. Fixes shipped (Wave 1 P2)

All critical and moderate fixes (M01–M05) implemented in one atomic changeset:

| File | Change |
|------|--------|
| `components/proposals/hub-pipeline-board.tsx` | Column width: `w-64 sm:w-[17.5rem]` (256px mobile, 280px sm+). Next column peeks 95px at 375px. |
| `app/(main)/proposals/page.tsx` | Controls bar: `flex-col gap-2.5 sm:flex-row` instead of `flex-wrap justify-between`. |
| `components/proposals/os/proposal-os-header.tsx` | "Change preset" button: `self-start` on mobile. |
| `components/proposals/os/builder-stage-bar.tsx` | Preset chip: `hidden sm:inline-flex`. |
| `app/(main)/proposal/page.tsx` | Mobile floating generate FAB: `fixed bottom-[5.5rem] right-4 z-[90]`, shows after customer name filled. |

---

## 5. Deferred / future

- M07 (dark mode form fields): Covered by Wave 1 P3 glass-tier token work.
- Full Kanban drag-and-drop: E5+ roadmap item, not in P2 scope.
- Presentation mode mobile optimization: Wave 4 P8.
