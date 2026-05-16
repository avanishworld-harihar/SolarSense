# Sol.52 — MASTERPLAN (Architecture & Platform Vision)

**Status:** Living document — long-term source of truth for architecture, multi-tenancy, RBAC, marketplace direction, and scaling.  
**Audience:** Core team, future implementations, and AI-assisted development (keep this file aligned with reality as the product evolves).  
**Product narrative & brand:** See `docs/SOL52_MASTER_PLAN.md` for historical product story and screen-level notes; **acquisition vs platform presentation** is defined in **`docs/ACQUISITION_BRANDING_ARCHITECTURE.md`**. **This file** owns **technical architecture**, **tenancy**, **permissions**, **ecosystem vs acquisition-brand boundaries**, and **roadmap sequencing**.

**Rule:** Before large features (marketplace, auth hardening, new modules), update this document with the decision and the phase it belongs to.

---

## 1. Platform vision

Sol.52 is evolving from a **best-in-class installer proposal & operations surface** into a **full solar ecosystem platform** — **database, domain logic, installer-facing app, and (over time) reusable HTTP APIs** that acquisition brands consume. **Harihar Solar and similar brands do not ship inside this frontend codebase**; they are separate repos and deployments (see §11).

- **Today:** CRM-style leads, projects pipeline, bill intelligence, interactive web proposals, normalized commercial pricing (`proposal_pricing` + line items), and installer workflows — all anchored in Supabase and this Next.js app.
- **Tomorrow:** Multi-company SaaS, role-based access, **API-first lead and calculator ingestion** from external brand frontends, optional marketplace for equipment and vendor discovery, and platform-level governance — **without** sacrificing clear **company isolation** or a **single coherent proposal engine**.

This is **not** “just a proposal PDF tool”; proposals remain a **core sales engine**, with pricing and org context feeding quotations, projects, and (later) marketplace-aware sourcing.

### 1.1 Ecosystem vs acquisition brands (long-term)

**SOL.52** is the **parent ecosystem platform** (this product): CRM, proposal generation, lead pipeline, vendor ecosystem, marketplace, analytics, automation, and the **canonical solar calculator / savings engine** (server-side truth and auditability).

**Local solar brands** (e.g. **Harihar Solar** as the first) are **customer-facing lead acquisition layers**: marketing sites, landing pages, social and paid traffic, public forms, and embeddable calculators. They exist to **capture demand** and **hand off** structured leads into SOL.52 — they do **not** replace org-scoped CRM, proposals, or pipeline ownership inside the platform.

**Design intent:** Support **many future local brands** connected to the same SOL.52 backbone. Each brand may have its own domain, content, and campaigns; **commercial and operational truth** remains in SOL.52 under **`organization_id`** (and future auth), with **explicit attribution** on inbound leads (which brand, which channel, which form or widget).

**Repository & codebase rule (non-negotiable for this model):**

- **Harihar Solar** (and every future local acquisition brand) is developed in its **own repository**, with its **own frontend stack, deployment, and branding**. It **must not** be implemented inside the SOL.52 app tree (`app/`, `components/` for brand marketing sites, etc.). Connection to SOL.52 is **only** via **HTTP APIs**, shared **Supabase-backed services** owned by this platform, webhooks, or server-to-server integration — same pattern for **marketplace** and **vendor ecosystem** expansion later.

**Non-breaking rules today:**

- Treat separate brand repos as the **default**; a monorepo that hosts both platform and brand UIs is an **explicit future opt-in**, not the baseline.
- Ingestion is **additive**: **public or partner APIs** (and optional webhooks) create or update **`leads`** (and related rows) with org + source metadata; existing tables and RLS direction in §6 stay intact.
- Customer-facing tools on a brand site that **call** SOL.52 should show **“Powered by SOL.52”** and **“SOL.52 Intelligence Engine”** where appropriate; installer-facing PPT and org-owned surfaces keep `docs/SOL52_MASTER_PLAN.md` rules. See **`docs/ACQUISITION_BRANDING_ARCHITECTURE.md`**.

**Avoid unnecessary complexity now:** do **not** add `acquisition_brands`, ingestion keys, or strict multi-brand RLS until **Phase B** org writes are reliable; see **§6.3** for the phased model.

---

## 2. Design principles

1. **Organization-first:** Every durable business object **must** be attributable to an **organization (company / tenant)**. Nullable columns are allowed only during migration; new writes should always set `organization_id` once auth + onboarding exist.
2. **Least privilege:** Three role **levels** (below) map to **policies**, not to ad-hoc checks scattered in UI only.
3. **Super Admin owns the marketplace:** Creation, moderation, seller approval, commissions, and global listing rules are **platform** concerns — **not** company-admin concerns.
4. **Proposal engine stays canonical:** Commercial truth remains **`proposal_pricing`** (and synced `proposals.ppt_input` / summaries) until a dedicated quotation module splits for good reason; marketplace **references** proposals/projects — it does not fork pricing silently.
5. **MVP stays shippable:** Schema and docs **prepare** for scale; **do not** ship marketplace UI or strict org RLS until auth and tenant routing are ready (see §9).

---

## 3. Multi-tenant role structure (target)

### 3.1 Super Admin (platform owner)

**Scope:** Global, cross-tenant.

**Capabilities (target):**

- All companies / organizations
- All users (subject to privacy law)
- All proposals, projects, leads (support & compliance)
- **Marketplace:** catalog governance, seller **approval**, moderation, featured vendors, commissions, listing visibility
- Subscriptions & billing (platform)
- Global analytics & audit
- Platform branding & legal settings
- Vendor ecosystem configuration

**Hard rule:** **Marketplace creation and global control belong only here.** Company admins never “run” the marketplace.

**Implementation note:** Until full auth: Super Admin may be represented by a **small allowlist** (e.g. `platform_super_admins` + service role) — see §6.

---

### 3.2 Company Admin (installer / company owner)

**Scope:** Single organization (their company).

**Capabilities (target):**

- Employees (invite, deactivate, assign roles)
- Customers / leads, projects, proposals, quotations
- Company pricing templates, branding, defaults
- Billing for **their** subscription (not platform-wide)

**Marketplace (buyer + optional seller):**

- Browse marketplace
- Select sellers/vendors, compare offers, contact vendors
- **Register their company as a seller** (subject to Super Admin approval)
- **Cannot:** approve other sellers, set global commissions, or moderate the whole marketplace

---

### 3.3 Employee / sales user

**Scope:** Organization-scoped, limited.

**Capabilities (target):**

- Create and edit **assigned** (or org-default) proposals & quotations flows
- Manage assigned leads / tasks
- Update projects they’re allowed to touch
- Send customer-facing links (proposals) per org policy

**Cannot:**

- Company-wide settings, billing, employee admin
- Marketplace administration
- Cross-organization data access

---

## 4. Organization-based ownership model

### 4.1 What must belong to an organization

| Domain | Ownership rule |
|--------|----------------|
| Leads / customers | `organization_id` required (nullable only during transition); **future:** optional acquisition-brand / channel attribution (see §1.1) — additive only |
| Projects | `organization_id` (denormalized OK for perf; must match lead’s org) |
| Proposals | `organization_id`; public share links remain opaque IDs — **authorization** for **edit** is org-scoped |
| Proposal pricing | Implicit via `proposals.id` → prefer **no duplicate org** on child table unless needed for RLS performance |
| Quotations (future) | `organization_id` + `proposal_id` |
| Employees / memberships | `organization_members.organization_id` |
| Marketplace listings (future) | Seller `organization_id` + Super Admin moderation state |
| Orders / inventory (future) | Seller org + buyer org references |

### 4.2 Access control pattern (target)

- **JWT claims** (or session): `user_id`, `organization_id` (active org), `platform_role` (`super_admin` \| null), `org_role` (`company_admin` \| `employee`).
- **RLS:** Policies use `organization_id` match for normal users; Super Admin uses **separate** policy branch or **security definer** RPCs for support tools.
- **Public proposal links:** Continue to work via **unguessable UUID**; **editing** APIs require org match (future).

---

## 5. Marketplace vision (future — not UI yet)

**Model:** B2B discovery similar in *spirit* to Amazon sellers / IndiaMART — **installers, distributors, inventory, offers**, matched by **location**, **system size**, **budget**, **brand preference**.

**Super Admin only:**

- Seller onboarding **approval**
- Moderation, featured placements, commissions, global visibility rules

**Company Admin:**

- Buyer workflows inside org
- Optional **seller registration** for their org
- Inquiries and comparison — **not** global moderation

### 5.1 Integration surfaces (future)

1. **`/marketplace` hub** — browse, filter, seller profiles  
2. **Project summary cards** — “nearby sellers”, inventory hints, indicative offers  
3. **Proposal / project flow** — attach marketplace SKUs or seller quotes as **references** (not a second silent price engine)

### 5.2 Proposal / pricing engine compatibility

- Keep **`proposal_pricing.line_items`** as the **commercial line-item model**; later, rows may gain optional `catalog_listing_id` / `seller_org_id` **nullable** columns — **additive migrations only**.
- Marketplace **never** replaces org-scoped proposal pricing without an explicit product decision recorded here.

### 5.3 Modular proposal engine (Phase 1 scaffold)

Dynamic proposal **sections** (cover, about, technical narrative, BOM, commercial, ROI, warranty, payment, terms, gallery, customer checklist, AMC) live in **`proposalLayout`** on `PremiumProposalPptInput`, driven by **`lib/proposal-block-registry.ts`** and **`lib/proposal-template-schema.ts`**. Each block is **toggleable** and **reorderable**; the existing 12-slide deck path stays the default customer experience until web quote / PDF renderers read the layout.

**BOM alignment:** **`lib/epc-component-catalog.ts`** holds master categories (panels, inverter, structure, ACDB/DCDB, cables, earthing, LA, net meter, installation, misc electricals, battery, monitoring). Normalized pricing rows may set optional **`catalog_category`** on line items for future marketplace / regional catalogs — additive only.

**Persistence:** **`PATCH /api/proposals/[id]/layout`** writes layout into **`proposals.ppt_input`** using the same proposal-row sync helper as pricing (refreshed **`summary`** scalars).

---

## 6. Database direction (scaffold vs product)

### 6.1 Shipped scaffold (see migration `020_organizations_foundation.sql`)

- **`organizations`** — tenant root (`name`, `slug`, `status`).
- **`organization_members`** — links `auth.users` to org + `org_role` (`company_admin` \| `employee`).
- **`platform_super_admins`** — explicit Super Admin allowlist (platform scope).
- **Nullable `organization_id`** on **`leads`**, **`proposals`**, **`projects`** — backward compatible; app code may ignore until auth.

**RLS:** New org tables ship with **RLS enabled** and **no broad policies** — **service role / migrations** own writes until JWT-based policies are designed. This avoids silently widening anon access.

### 6.2 Next schema phases (document only until prioritized)

- `quotations` (org + proposal FK, PDF metadata, status)
- `marketplace_sellers`, `marketplace_listings`, `marketplace_inquiries` (all org-scoped + Super Admin moderation columns)
- `subscription_plans`, `organization_subscriptions` (billing)
- Optional **`catalog_skus`** for internal + marketplace alignment
- **When Phase G starts:** **`acquisition_brands`** (or equivalent) + lead attribution columns / metadata — see **§6.3**; **additive migrations only**.

### 6.3 Advisory: scalable tenant & multi-brand ingestion (phased — no extra tables required until APIs ship)

**Tenant boundary (keep simple):** **`organizations`** remains the **only** tenant root for CRM, proposals, projects, and marketplace participation. Do **not** introduce a parallel “tenant” or “workspace” model; use **`organization_id`** everywhere durable business data lives.

**Acquisition brand routing:** Inbound traffic from external sites must resolve to **exactly one `organization_id`** for writes (routing). Recommended pattern:

1. **`acquisition_brands`** (small registry): `id`, `slug` (stable, URL-safe), `display_name`, **`organization_id`** (FK — which CRM receives the lead), `status` (`active` \| `paused`), optional `notes`. One org may own **multiple** brands (e.g. regional sites); one brand maps to **one** primary org for MVP routing.
2. **`leads`**: add when ingestion lands — **`acquisition_brand_id`** (nullable FK) **or** denormalized `acquisition_brand_slug` only if you need keyless joins from logs; prefer FK. Optional **`ingestion_channel`** (`web_form` \| `calculator` \| `social` \| `ads` \| `manual`), **`utm_source` / `utm_medium` / `utm_campaign`** (nullable text), **`external_submission_id`** (idempotency / dedup from brand CMS). **Alternative for smallest first step:** a single **`ingestion_metadata` JSONB** on `leads` until UTM reporting needs normalized columns.
3. **API authentication (external brands):** Prefer **org- or brand-scoped API keys** or **signed server-to-server tokens** stored as secrets on the brand backend — **not** end-user Supabase anon keys on public marketing pages. Keys map to `(organization_id, acquisition_brand_id)` for attribution and rate limits. User JWTs remain for the installer app only.
4. **Calculator engine:** Keep **one canonical implementation** in SOL.52 (`lib/*` + **Next.js API routes** or future extracted **Edge/worker** handlers reading the same DB rules). Brand sites **POST** inputs → receive structured outputs; **never** duplicate tariff / subsidy logic in brand repos. **Homeowner / acquisition path:** `lib/public-solar-calculator.ts` wraps **`calculateSolar`** with uniform monthly consumption; **HTTP:** `POST /api/v1/public/estimate-solar` (versioned **`v1/public`** for future stable contracts). Same core math as installer flows; different input contract and response shape for consumers.

**What to defer (avoid premature complexity):** separate databases per brand; per-brand schemas; second price engine; full UTM warehouse before first ingestion MVP; cross-brand shared “pools” before product need.

---

## 7. RBAC matrix (summary)

| Capability | Super Admin | Company Admin | Employee |
|------------|-------------|---------------|----------|
| Global marketplace control | ✅ | ❌ | ❌ |
| Approve sellers globally | ✅ | ❌ | ❌ |
| Browse / use marketplace | ✅ (support) | ✅ | Per policy |
| Register org as seller | N/A | ✅ (pending approval) | ❌ |
| Org employees & roles | All orgs | Own org | ❌ |
| Org billing | Platform | Own org | ❌ |
| Proposals / pricing | All (support) | Own org | Own org / assigned |
| Projects / leads | All (support) | Own org | Assigned |

---

## 8. Scaling roadmap (suggested phases)

| Phase | Focus |
|-------|--------|
| **A — Now** | Org tables + nullable FKs; app remains MVP; document vision (this file). |
| **B** | Auth (Supabase Auth), JWT claims, set `organization_id` on writes, admin onboarding. |
| **C** | RLS tightening per org; remove permissive anon where no longer needed; Super Admin tools. |
| **D** | Quotation module v2 + audit trail; optional catalog references on line items. |
| **E** | Marketplace MVP: seller registry, listings, inquiries, Super Admin console. |
| **F** | Subscriptions, commissions, analytics, integrations. |
| **G** | **Acquisition layer (API-first):** HTTP APIs for **lead create/update**, **calculator run** (inputs → SOL.52 engine output), **webhooks** out optional; **`acquisition_brands`** + attribution on **`leads`**; **rate limits** and **scoped credentials**; org routing resolved server-side — **after** Phase **B** org writes are stable. External brand repos call **only** these surfaces + shared backend. |

Phases can overlap; **do not** skip **B** before claiming production multi-tenancy. **G** must not bypass **organization_id** or future RLS rules in **C**.

---

## 9. MVP boundaries (current)

**In scope today:**

- Single-tenant style deployment with existing anon/authenticated patterns
- Proposal hub, pricing configurator, CRM, projects, public `/proposal/[id]`

**Explicitly out of scope until phased:**

- Marketplace UI
- Strict org isolation in RLS for all tables
- Commission engine
- Multi-org user switching UI
- **Harihar Solar or any acquisition-brand marketing site in this repo** — those live in **separate repositories and deployments** by design; this codebase remains **platform + installer client** only unless an explicit monorepo decision is recorded here.

---

## 10. Ecosystem & multi-brand acquisition (summary)

| Concern | Owner |
|--------|--------|
| CRM, pipeline, proposals, marketplace, analytics, automation, calculator engine | **SOL.52** (platform) |
| Public storytelling, local trust, SEO, ads, social, generic lead forms | **Acquisition brand** (e.g. Harihar Solar site) |
| Lead record of truth, assignment, follow-up, quotation | **Organization** inside SOL.52 |

**Lead path (target):** Brand repos (separate deployments) → **SOL.52 APIs** → **`leads`** (+ optional calculator snapshot / metadata) → existing CRM and proposal flows. **Multiple brands** resolve to **one or more `organization_id`s** via **`acquisition_brands`** (or config); Super Admin may extend cross-brand policy later without breaking single-org defaults.

---

## 11. Repository & deployment boundaries

| Asset | Where it lives |
|-------|----------------|
| SOL.52 installer PWA / Next.js app, proposal UI, internal CRM screens, platform admin (future) | **This repository** |
| Supabase schema, RLS (phased), Edge functions if added | **Platform-owned** (same project or split only if ops require) |
| Harihar Solar website, brand calculators UI, ads landing pages, brand-specific CMS | **Separate repository(ies)** — own CI/CD and domains |
| Canonical calculator, tariff, proposal pricing, lead persistence | **SOL.52** — invoked via **APIs** or shared DB **only** through controlled server paths |

**Integration contract:** Brand frontends **never** embed service-role keys or bypass org routing. They call **versioned SOL.52 HTTP APIs** (or a thin BFF that holds secrets). Shared “backend services” means **logic and data owned by the platform**, not duplicated business rules in brand repos.

---

## 12. Change control

- Any **new table** that stores business data: add **`organization_id`** (or justified exception in this file).
- Any **marketplace** feature: confirm Super Admin vs Company Admin split against §3 and §5.
- Any **acquisition / multi-brand** or **external-repo** integration: confirm **§1.1**, **§6.3**, **§10**, **§11**, **§13**, and **Phase G** ordering vs auth (**B**) and RLS (**C**).
- After major releases, update **§8** and the “MVP boundaries” section (**§9**).

---

## 13. Platform branding & multi-brand presentation

**Canonical doc:** [`docs/ACQUISITION_BRANDING_ARCHITECTURE.md`](docs/ACQUISITION_BRANDING_ARCHITECTURE.md)  
**Code:** `lib/platform-branding.ts` (strings, registry, API metadata) · `components/acquisition/platform-brand-badge.tsx` (acquisition UI only)

| Layer | Customer sees | Platform credit |
|-------|---------------|-----------------|
| Acquisition site (Harihar, future) | Local brand hero | **Powered by SOL.52**, **SOL.52 Intelligence Engine** on tools |
| Installer PPT / org proposals | Installer + customer | Minimal **Sol.52** footer (unchanged product rules) |
| Public APIs | JSON + `branding` block | Same canonical strings from `platformBrandBlock()` |

**Services powered by SOL.52:** calculators, proposals, CRM workflows, analytics, automation — **one engine**, many brand skins. New brands add registry + repo + API keys; **do not** fork tariff/proposal logic.

**Change control:** New acquisition brand → update registry in `platform-branding.ts` (or DB in Phase G) and the checklist in the branding doc; confirm §1.1 and §11.

---

*End of MASTERPLAN — keep implementations honest and the platform vision single-threaded.*
