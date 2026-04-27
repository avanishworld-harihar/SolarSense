-- Sol.52 — CRM v2: lead source attribution, dedup, dashboard visibility, soft archive.
--
-- Workflow:
--   1. Leads now carry { state, email, source, source_meta, last_touched_at } so
--      manual + website + WhatsApp + Meta Lead Ads all share one normalized table.
--   2. A unique partial index on lower(phone) prevents duplicate inflow when the
--      same lead reaches us via two channels — the inbound endpoint upserts.
--   3. Projects gain `dashboard_visible` (operator can declutter the dashboard
--      without losing the row from /projects) and `archived_at` (end-of-life).
--   4. Legacy CRM stage `site-survey-scheduled` is migrated to `contacted` so the
--      pipeline collapses to the 4 spec stages: new → contacted → proposal-sent → won.
--      Site survey now lives only on the Project pipeline as `next_action`.

-- ── leads ────────────────────────────────────────────────────────────────────
alter table public.leads
  add column if not exists state text,
  add column if not exists email text,
  add column if not exists source text not null default 'manual',
  add column if not exists source_meta jsonb,
  add column if not exists last_touched_at timestamptz;

comment on column public.leads.state is
  'Indian state / UT (free-text from INDIAN_STATES_AND_UTS list).';
comment on column public.leads.email is
  'Optional contact email (Meta Lead Ads sometimes provides this).';
comment on column public.leads.source is
  'Sol.52 — lead origin: manual | website | whatsapp | meta_fb | meta_ig | api.';
comment on column public.leads.source_meta is
  'Raw provider payload for audit (form_id, ad_id, wa_message_id, etc.).';
comment on column public.leads.last_touched_at is
  'Bumped on call / WhatsApp / status-change / inbound match. Powers the stale-leads filter.';

create index if not exists leads_source_idx
  on public.leads (source, created_at desc);

create index if not exists leads_last_touched_idx
  on public.leads (last_touched_at desc nulls last);

-- Phone-based dedup. Partial so rows without a phone are unaffected.
create unique index if not exists leads_phone_unique
  on public.leads (lower(phone)) where phone is not null and length(trim(phone)) > 0;

-- Migrate legacy CRM stage: site survey is now project-pipeline only.
update public.leads
   set status = 'contacted'
 where status in ('site-survey-scheduled', 'site_survey_scheduled');

-- ── projects ────────────────────────────────────────────────────────────────
alter table public.projects
  add column if not exists dashboard_visible boolean not null default true,
  add column if not exists archived_at timestamptz;

comment on column public.projects.dashboard_visible is
  'When false, project is hidden from the home dashboard (still visible on /projects).';
comment on column public.projects.archived_at is
  'Soft-archive timestamp. Archived projects are excluded from the dashboard and the default /projects view.';

-- Partial index used by the dashboard-stats query (visible, non-archived, recent).
create index if not exists projects_dashboard_visible_idx
  on public.projects (updated_at desc)
  where dashboard_visible = true and archived_at is null;

-- ── RLS (idempotent) ────────────────────────────────────────────────────────
alter table public.leads enable row level security;
alter table public.projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and policyname = 'Allow anon update leads'
  ) then
    create policy "Allow anon update leads"
      on public.leads
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
