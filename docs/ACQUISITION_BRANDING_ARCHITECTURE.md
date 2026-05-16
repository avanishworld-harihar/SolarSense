# Acquisition & platform branding architecture

**Status:** Living document — canonical rules for SOL.52 (platform) vs local acquisition brands (e.g. Harihar Solar).  
**Code module:** [`lib/platform-branding.ts`](../lib/platform-branding.ts) · **UI primitive:** [`components/acquisition/platform-brand-badge.tsx`](../components/acquisition/platform-brand-badge.tsx)  
**Platform architecture:** [`MASTERPLAN.md`](../MASTERPLAN.md) §1.1, §10–§11, §13

---

## 1. Brand layers (three roles)

| Layer | Name | Audience | Owns |
|-------|------|----------|------|
| **Platform / ecosystem** | **SOL.52** | Installers, ops, APIs, future partners | CRM, proposals engine, calculator engine, tariffs, marketplace, analytics, automation, shared APIs |
| **Installer product** | **Sol.52** (app) | Sales / EPC teams under an `organization` | Day-to-day CRM, proposals, projects, pricing config |
| **Acquisition brand** | **Harihar Solar** (first of many) | Homeowners, ads, SEO, social | Trust, local story, campaigns, **customer-facing** site & calculator **UI** |

**Rule:** Acquisition brands are **heroes** on their own properties. SOL.52 is **credited**, not competing for the headline.

---

## 2. What runs on SOL.52 services (shared infrastructure)

All of the following use **one** platform implementation — no forked logic in brand repos:

| Capability | Platform owner | Brand repo |
|------------|----------------|------------|
| Homeowner / public calculator | `lib/public-solar-calculator.ts` → `POST /api/v1/public/estimate-solar` | UI + marketing only |
| Installer / vendor calculator & bill intelligence | `lib/solar-engine.ts`, proposal flows | — |
| Lead ingestion | `POST /api/leads/inbound` (+ webhooks) | Forms, CTAs |
| CRM, pipeline, assignments | Supabase `leads`, projects | — |
| Proposal generation & pricing | `proposal_pricing`, `proposals`, export | Optional “request proposal” CTA → lead/API |
| Analytics & automation (future) | Platform jobs, org-scoped | Embeds / pixels only |

Brand sites call **versioned HTTP APIs** (`/api/v1/public/*`, inbound leads, future proposal-request endpoints). See **MASTERPLAN** Phase **G**.

---

## 3. Canonical platform copy (do not paraphrase in brand sites)

Use exports from `lib/platform-branding.ts`:

| Key | Customer-facing line | When to use |
|-----|----------------------|-------------|
| `POWERED_BY_LINE` | **Powered by SOL.52** | Calculator footers, widgets, embeds, API `branding.poweredBy` |
| `INTELLIGENCE_ENGINE_LINE` | **SOL.52 Intelligence Engine** | Tool headers, “how we calculate”, results panel subline, API metadata |
| `PLATFORM_TAGLINE` | *Solar Intelligence. Total Support.* | Optional secondary line near platform logo |
| `PROPOSAL_PLATFORM_CREDIT` | **Powered by SOL.52** | Customer-facing proposal / quote deck (installer + customer still primary) |
| `PROPOSAL_INSTALLER_FOOTER` | Powered by Sol.52 | Minimal footer on **installer-generated** PPT/HTML (existing product rule) |

**Naming:** Platform layer = **SOL.52** (caps, dot). Installer app = **Sol.52** in app-store / internal contexts.

---

## 4. Surface matrix (who is primary, what to show)

| Surface | Primary brand | Platform credit |
|---------|---------------|-----------------|
| Acquisition calculator (Harihar site) | Harihar Solar | Footer: Powered by SOL.52 + Intelligence Engine line |
| Acquisition landing / ads | Harihar Solar | Same; optional small logo |
| Lead form (post-calculator) | Harihar Solar | `source_meta` + optional footer |
| Public API JSON response | — | `branding` object (see API) |
| Customer web proposal `/proposal/[id]` | Installer + customer | Minimal SOL.52 / Sol.52 per existing PPT rules |
| Installer app dashboard | Sol.52 app | Standard app chrome — **not** acquisition rules |
| Installer PPT export | Installer company | Tiny Sol.52 footer only |

---

## 5. Multi-brand expansion (modular model)

### 5.1 Brand registry (today → Phase G)

- **Now:** `ACQUISITION_BRANDS` in `lib/platform-branding.ts` (e.g. `harihar_solar`).
- **Later:** `acquisition_brands` table → `slug`, `display_name`, `organization_id`, `status`, optional theme tokens (logo URL, primary color) for **white-label UI kits** — not duplicate engines.

Each new brand:

1. Add registry entry (or DB row).
2. Separate repo / deployment for marketing UI.
3. Map inbound leads: `source_meta.acquisition_brand_slug` = `harihar_solar`.
4. Reuse `PlatformBrandBadge` + `platformBrandBlock()` — same SOL.52 strings everywhere.

### 5.2 Theming vs engine

| Custom per brand | Shared platform |
|------------------|-----------------|
| Logo, colors, typography, domain, Hindi/English copy | Tariffs, sizing, subsidy math, CRM, proposals |
| WhatsApp number, office address | Rate limits, API keys, org routing |

### 5.3 Proposal generation branding

- **Commercial truth** always from SOL.52 proposal engine for that `organization_id`.
- **Visual hero:** acquisition or installer brand on cover; platform credit on last slide / footer only.
- Future: `?brand=harihar_solar` on proposal links could swap cover assets while keeping one engine (document before building).

---

## 6. API contract (acquisition clients)

Public estimate responses may include:

```json
{
  "ok": true,
  "engineVersion": "1.0.0",
  "branding": {
    "platformName": "SOL.52",
    "poweredBy": "Powered by SOL.52",
    "intelligenceEngine": "SOL.52 Intelligence Engine",
    "tagline": "Solar Intelligence. Total Support.",
    "logoSrc": "/sol52-logo.png?v=4",
    "surface": "public_api"
  },
  "estimates": { }
}
```

External brand repos should **read `branding` from API** (or import `platform-branding.ts` if sharing a package) — avoid hardcoding strings in Harihar-only code.

**Inbound leads** — stable metadata keys (`ACQUISITION_SOURCE_META_KEYS`):

- `acquisition_brand_slug`
- `funnel` (e.g. `harihar_solar_calculator`)
- `platform_surface` (e.g. `acquisition_calculator`)
- `calculator_engine_version`

---

## 7. Repository boundaries (reminder)

| Lives in SOL.52 repo | Lives in brand repo (e.g. Harihar) |
|----------------------|-------------------------------------|
| `lib/platform-branding.ts`, public APIs, CRM, installer app | Marketing site, brand calculator **skin**, local CTAs |
| Reference implementation: `app/(acquisition)/harihar-solar/calculator` (optional host / demo) | Production Harihar domain (target) |

The in-repo Harihar route is a **reference implementation** of the branding contract; production may move to a separate repo per **MASTERPLAN** §11.

---

## 8. Checklist for a new acquisition brand

- [ ] Register `slug` in `ACQUISITION_BRANDS` (or DB when Phase G ships)
- [ ] Create brand repo + deployment; **no** duplicated calculator/proposal math
- [ ] Wire `POST /api/v1/public/estimate-solar` and `/api/leads/inbound`
- [ ] Use `PlatformBrandBadge` or API `branding` on all tool surfaces
- [ ] Set `source_meta.acquisition_brand_slug` on every lead
- [ ] Legal: disclaimers from API `disclaimers` array on calculator results
- [ ] Confirm org routing → correct `organization_id` for CRM

---

*End of acquisition branding architecture — update when Phase G registry or proposal white-label ships.*
