-- Sol.52 — project-level BOM customization.
--
-- Workflow:
--   1. Customer's bill is uploaded → `projects` row is auto-created (rough
--      proposal uses the default BOM from `lib/proposal-deck-helpers.ts`).
--   2. Installer later opens the project window and chooses *final* products
--      (panel brand/model, inverter brand/model, etc.). These overrides are
--      saved here so the next proposal generation uses the locked-in spec.
--
-- `bom_overrides` is a JSONB array of { slot, title?, spec?, brand?, warranty? }
-- entries. Any field that is omitted falls back to the default BOM row.

alter table public.projects
  add column if not exists bom_overrides jsonb,
  add column if not exists bom_locked_at timestamptz;

comment on column public.projects.bom_overrides is
  'Sol.52 — final-product picks per project (slot, brand, spec, warranty). Merged on top of the default BOM at proposal-render time.';
comment on column public.projects.bom_locked_at is
  'When the installer locked the BOM for this project (i.e. moved from rough → final proposal).';

-- Enabled in 004_projects_pipeline.sql, but RLS is idempotent so this is safe.
alter table public.projects enable row level security;
