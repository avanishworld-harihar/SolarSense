-- Sol.52 — Add projects.lead_id when missing, link to public.leads(id), ON DELETE SET NULL.
-- Use this if your `projects` table was created without `lead_id` (or 014 failed earlier).
-- Requires public.leads(id) to exist.

-- 1) Column (nullable; existing rows keep NULL until you link them)
alter table public.projects
  add column if not exists lead_id uuid;

-- 2) Remove any previous FK on this column name
alter table public.projects
  drop constraint if exists projects_lead_id_fkey;

-- 3) SET NULL requires the column to be nullable
alter table public.projects
  alter column lead_id drop not null;

-- 4) FK: deleting a lead clears lead_id; project row stays
alter table public.projects
  add constraint projects_lead_id_fkey
  foreign key (lead_id) references public.leads (id)
  on delete set null;

-- 5) Upsert / one row per lead (PostgreSQL allows many NULLs in a UNIQUE index)
create unique index if not exists projects_lead_id_key
  on public.projects (lead_id);

alter table public.projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Allow anon delete projects'
  ) then
    create policy "Allow anon delete projects"
      on public.projects
      for delete
      to anon
      using (true);
  end if;
end
$$;
