# SOL.52 Simplicity Laws

> **"Simple on the surface, powerful underneath."**
>
> These 10 laws are the non-negotiable cross-cutting principles that govern every
> file, component, migration, and design decision in SOL.52. They are derived from
> `lib/design-system.ts` (the token layer) and the Proposal OS architecture.
>
> Treat violations as bugs. When in doubt, revisit Law 1.

---

## Law 1 — One Source of Truth per Concern

Every design value (color, blur, radius, motion, spacing) lives in **exactly one**
canonical location. New primitives reference `lib/design-system.ts`. Old primitives
migrate to it gradually. Duplication is a defect.

| Concern | Canonical location |
|---|---|
| Accent tone palettes | `TONES` / `DS.tone` |
| Glass tier classes | `GLASS_TIER` / `DS.glass` |
| Motion durations & easing | `DURATION`, `EASING` / `DS.duration`, `DS.easing` |
| Spacing rhythm | `PAD`, `GAP`, `SPACE_Y` |
| Container widths | `containerClass()` / `DS.container` |
| UI strings (EN/HI/TA) | `lib/i18n-messages.ts` |
| Narrative copy | `lib/proposal-story-copy.ts` |

**Enforcement:** Never hard-code a hex color, blur value, or duration constant
inside a component. Import from `DS` or the relevant lib file.

---

## Law 2 — Additive Migrations Only

The database schema and the CSS token namespace grow in **one direction: forward**.
No column, class, or export is ever removed in a migration. Every migration file
must:

- Use `ADD COLUMN IF NOT EXISTS` — never `DROP COLUMN`.
- Add `COMMENT ON COLUMN` for every new column.
- Provide a safe backfill `UPDATE` when a default is derivable from existing data.
- Leave all existing API shapes, RLS policies, and foreign keys intact.

**Enforcement:** CI must reject any migration that contains `DROP COLUMN`,
`DROP TABLE`, or `ALTER COLUMN … TYPE` without an explicit exemption comment.

---

## Law 3 — 375 px is the Design Surface

Every UI surface is designed and audited at **375 px (iPhone SE equivalent)**
before it ships. Responsive breakpoints add space and richness — they never add
functionality that 375 px users cannot reach.

The mobile-first checklist for every new component or page:

- [ ] No horizontal overflow at 375 px.
- [ ] Primary CTA is reachable without scrolling (sticky or floating FAB).
- [ ] No text truncation that loses meaning.
- [ ] Touch targets are ≥ 44 px tall.
- [ ] Decorative elements hidden on `sm:` or below do not carry critical information.

**Enforcement:** See `docs/audits/09-mobile-baseline.md` for the living audit record.
Run Playwright viewport tests at `{ width: 375, height: 812 }` before merging new routes.

---

## Law 4 — Glass is Tiered and Subtle

Glassmorphism is a premium signal, not a decoration style. All backdrop-blur on
Proposal OS surfaces must use the canonical four tiers from `GLASS_TIER`:

| Tier | CSS class | When to use |
|---|---|---|
| `surface` | `proposal-os-glass-card` | Metric tiles, stage bar, inline cards |
| `elevated` | `proposal-os-glass-sheet` | Bottom sheets, preset picker, modals |
| `overlay` | `proposal-os-glass-backdrop` | Full-screen dark scrims |
| `drawer` | `proposal-os-glass-drawer` | Slide-in side drawers |

Shell chrome (NavRail, TopBar, CommandPalette) has its own glass recipe
(`backdrop-blur-xl backdrop-saturate-150`) and is **not** managed by `GLASS_TIER`.

**Enforcement:** `rg 'backdrop-blur-(?!xl|none)' components/proposals/` must return
zero results. All blur values for proposal surfaces live in `globals.css`
`.proposal-os-glass-*` classes — never inline.

---

## Law 5 — Motion is Purposeful, Never Decorative

Every animation must serve a specific purpose from this list:

- **Reveal**: content entering the viewport for the first time.
- **Feedback**: confirming a user action (press, hover, success).
- **Transition**: navigating between states (drawer open/close, stage change).
- **Attention**: directing the eye to an actionable element (subtle pulse, glow).

Animation budget per interaction:

| Purpose | Max duration | Easing |
|---|---|---|
| Feedback (hover, press) | 200 ms | `ease-out` |
| Transition (drawer, modal) | 350 ms | `EASING.reveal` |
| Reveal (block entrance) | 600 ms | `EASING.reveal` |
| Count-up (dashboard KPI) | 950 ms | linear |
| Count-up (proposal block) | 1 400 ms | linear |

**Enforcement:** No `transition-all`. No `duration-[` arbitrary values — use
`DURATION.*` constants. Prefer `motion.div` with `variants` over inline `animate`.

---

## Law 6 — Hindi Parity is Non-Negotiable

SOL.52 is built for the Indian solar market. Every user-visible string must have
a Hindi translation before the feature ships. The parity contract:

- `lib/i18n-messages.ts` — every key in `EN` must have an equivalent in `HI`.
- `lib/proposal-story-copy.ts` — commercial narrative content ships Hindi-first
  (`HI_COPY`) with English as the secondary dictionary (`EN_COPY`).
- `proposals.lang_mode` — stores `'en' | 'hi' | 'bilingual'`; defaults to `'en'`
  for backward compatibility.
- UI language toggle renders both scripts (Devanagari + Latin) at equal visual weight.

**Enforcement:** A lint script (Wave 2) will diff `Object.keys(EN)` vs `Object.keys(HI)`
and fail on any gap. Until then, manually verify parity before merging.

---

## Law 7 — Preset Identity Drives Rendering

A proposal's `preset_id` (`residential_smart` | `commercial_executive`) is the
single input that controls:

- Deck mode (light vs. dark surface — `PRESET_THEMES[id].deckMode`).
- Primary + secondary accent tones.
- Section spacing density.
- Heading style (balanced vs. impact).
- Which blocks appear in the default playlist.

No component inspects `preset_id` directly — it calls `getPresetTheme(presetId)`
from `DS.presetTheme`. Block IDs never change between presets; only the rendered
style variant changes (Wave 3 P6).

**Enforcement:** `lib/proposal-preset-engine.ts` is the gatekeeper for all
preset-to-rendering decisions. Components receive typed props, never raw preset strings.

---

## Law 8 — Marketplace is Permanently Deferred

The following schema elements must **never** appear in the codebase:

```
seller_* | marketplace_* | commission_* | pricing_line.marketplace_*
```

The marketplace feature set is architectural scope for a future product boundary.
Premature introduction creates regulatory, financial, and audit surface that SOL.52
cannot absorb today.

Allowed UI only (no schema, no API):
- Disabled "Marketplace" tab in the workspace nav (placeholder only).
- "Marketplace-ready" chip on commercial proposals (visual badge, not wired).
- Story-mode placeholder paragraph referencing future marketplace capability.

**Enforcement:** The CI guardrail added in `continuous-marketplace-guard` will fail
any migration or TypeScript file that introduces the forbidden identifiers.

---

## Law 9 — Type Safety is the Contract

SOL.52 targets zero TypeScript errors at all times. Every wave ends with:

```powershell
npx tsc --noEmit
```

returning exit code `0`.

Type safety rules:
- No `any` in new code. Use `unknown` + type guards for untrusted data.
- All Supabase query results typed via generated `Database` types.
- `DS` and all design-system exports are `as const` — use `typeof DS.glass[keyof typeof DS.glass]` for derived union types.
- Props interfaces are explicit — no `[key: string]: unknown` escape hatches
  in component prop types.

**Enforcement:** TypeScript strict mode is on. `noImplicitAny`, `strictNullChecks`,
`strictFunctionTypes` are active. Do not disable them with `// @ts-ignore` unless
accompanied by a dated comment explaining the limitation and a tracking issue.

---

## Law 10 — The UI Disappears Into the Work

The ultimate measure of SOL.52's quality is that a solar installer never thinks
about the software — they think about the customer. Every design decision must
answer: *does this help the installer close the deal faster?*

Practical implications:
- Defaults are always better than options. Expose configuration only when the
  installer would actively want to change it.
- The happy path is friction-free. Edge cases and power features are one
  deliberate step away — never zero steps, never buried.
- Labels speak in business language (₹ savings, kWh, years payback), not
  software language (IDs, UUIDs, booleans).
- Empty states are opportunities, not gaps. Show what the user should do next.
- Confirmation dialogs are a last resort. Prefer undo over confirm.

**Enforcement:** Every new feature must pass the "does this disappear?" test in
a brief product review before merge. If the reviewer notices the UI more than
the outcome, redesign.

---

## Reference

| File | Laws it implements |
|---|---|
| `lib/design-system.ts` | 1, 4, 5, 7 |
| `lib/i18n-messages.ts` | 6 |
| `lib/proposal-story-copy.ts` | 6 |
| `supabase/migrations/024_proposals_lang_mode.sql` | 2, 6 |
| `docs/audits/09-mobile-baseline.md` | 3 |
| `components/ui/panel.tsx` | 1, 4 |
| `app/globals.css` (`.proposal-os-glass-*`) | 4 |
| CI guardrail (Wave 2, `continuous-marketplace-guard`) | 8 |

---

*Last updated: Wave 1 implementation — Proposal OS Perfection Roadmap.*
