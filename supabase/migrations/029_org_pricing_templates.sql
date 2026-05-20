-- Reusable commercial pricing templates (org-scoped; service role until RLS policies ship).

CREATE TABLE IF NOT EXISTS public.org_pricing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  preset_id text NOT NULL DEFAULT 'commercial_executive',
  system_kw numeric NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  commercial_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_pricing_templates_org_idx
  ON public.org_pricing_templates (organization_id, updated_at DESC);

COMMENT ON TABLE public.org_pricing_templates IS
  'Saved commercial BOM + commercialConfig presets for fast reuse on new proposals.';

ALTER TABLE public.org_pricing_templates ENABLE ROW LEVEL SECURITY;
