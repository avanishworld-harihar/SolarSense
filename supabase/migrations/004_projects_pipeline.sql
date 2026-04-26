-- Pipeline projects linked to CRM leads; official bill name stored separately from lead contact name.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  official_name text,
  capacity_kw text,
  detail text,
  status text not null default 'pending',
  install_progress int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_install_progress_range check (install_progress >= 0 and install_progress <= 100)
);

create unique index if not exists projects_lead_id_key on public.projects(lead_id);

create index if not exists projects_created_at_idx on public.projects (created_at desc);

comment on column public.projects.official_name is 'Name as printed on electricity bill (may differ from leads.name).';

alter table public.projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Allow anon read projects'
  ) then
    create policy "Allow anon read projects"
      on public.projects
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Allow anon insert projects'
  ) then
    create policy "Allow anon insert projects"
      on public.projects
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Allow anon update projects'
  ) then
    create policy "Allow anon update projects"
      on public.projects
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
