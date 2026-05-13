# Sol.52 — MASTERPLAN (Architecture & Platform Vision)

**Status:** Living document — long-term source of truth for architecture, multi-tenancy, RBAC, marketplace direction, and scaling.  
**Audience:** Core team, future implementations, and AI-assisted development (keep this file aligned with reality as the product evolves).  
**Product narrative & brand:** See `docs/SOL52_MASTER_PLAN.md` for historical product story and screen-level notes; **this file** owns **technical architecture**, **tenancy**, **permissions**, and **roadmap sequencing**.

**Rule:** Before large features (marketplace, auth hardening, new modules), update this document with the decision and the phase it belongs to.

---

## 1. Platform vision

Sol.52 is evolving from a **best-in-class installer proposal & operations surface** into a **full solar ecosystem platform**:

- **Today:** CRM-style leads, projects pipeline, bill intelligence, interactive web proposals, normalized commercial pricing (`proposal_pricing` + line items), and installer workflows.
- **Tomorrow:** Multi-company SaaS, role-based access, optional marketplace for equipment and vendor discovery, and platform-level governance — **without** sacrificing clear **company isolation** or a **single coherent proposal engine**.

This is **not** “just a proposal PDF tool”; proposals remain a **core sales engine**, with pricing and org context feeding quotations, projects, and (later) marketplace-aware sourcing.

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
| Leads / customers | `organization_id` required (nullable only during transition) |
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

Phases can overlap; **do not** skip **B** before claiming production multi-tenancy.

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

---

## 10. Change control

- Any **new table** that stores business data: add **`organization_id`** (or justified exception in this file).
- Any **marketplace** feature: confirm Super Admin vs Company Admin split against §3 and §5.
- After major releases, update **§8** and the “MVP boundaries” section.

---

*End of MASTERPLAN — keep implementations honest and the platform vision single-threaded.*
