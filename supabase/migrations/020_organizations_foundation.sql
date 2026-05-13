-- Sol.52 — Multi-tenant foundation (organizations + membership + platform super admins).
-- MVP-safe: nullable organization_id on core CRM/proposal rows; app may ignore until auth.
-- RLS: enabled on new tables without permissive policies — use service role until JWT policies ship.
-- See MASTERPLAN.md for RBAC vision and phased rollout.

-- ── organizations (tenant root) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS organizations_status_idx ON public.organizations (status);

COMMENT ON TABLE public.organizations IS 'Sol.52 tenant (installer company). All CRM/proposal data eventually scoped here.';

-- ── organization members (links auth.users → org + org-level role) ───────────
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('company_admin', 'employee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_org_user_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_members_user_idx ON public.organization_members (user_id);
CREATE INDEX IF NOT EXISTS organization_members_org_idx ON public.organization_members (organization_id);

COMMENT ON TABLE public.organization_members IS 'Company Admin vs Employee within one organization. Super Admin is separate (platform_super_admins).';
COMMENT ON COLUMN public.organization_members.role IS 'company_admin | employee — see MASTERPLAN.md';

-- ── platform super admins (global; marketplace & cross-tenant governance) ───
CREATE TABLE IF NOT EXISTS public.platform_super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  note text NULL
);

COMMENT ON TABLE public.platform_super_admins IS 'Platform owner allowlist. Marketplace creation/control per MASTERPLAN.md.';

-- ── scope existing business tables (nullable during transition) ─────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL REFERENCES public.organizations (id) ON DELETE SET NULL;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL REFERENCES public.organizations (id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL REFERENCES public.organizations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_organization_id_idx ON public.leads (organization_id);
CREATE INDEX IF NOT EXISTS proposals_organization_id_idx ON public.proposals (organization_id);
CREATE INDEX IF NOT EXISTS projects_organization_id_idx ON public.projects (organization_id);

COMMENT ON COLUMN public.leads.organization_id IS 'Tenant scope; required once auth + onboarding enforced.';
COMMENT ON COLUMN public.proposals.organization_id IS 'Tenant scope; public share link unchanged; edit APIs become org-scoped.';
COMMENT ON COLUMN public.projects.organization_id IS 'Tenant scope; should match lead org when both set.';

-- ── RLS: lock down new tables until explicit policies exist ───────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_super_admins ENABLE ROW LEVEL SECURITY;

-- proposal_pricing remains scoped via proposals.organization_id (no duplicate org column in this phase).
