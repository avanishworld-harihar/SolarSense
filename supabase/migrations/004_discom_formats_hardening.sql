-- Hardening migration for discom template memory table.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.discom_formats (
  id uuid primary key default gen_random_uuid(),
  discom_code text not null unique,
  history_extraction_hint text not null,
  updated_at timestamptz not null default now()
);

alter table public.discom_formats enable row level security;

grant select, insert, update on public.discom_formats to anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'discom_formats'
      and policyname = 'Allow anon read discom_formats'
  ) then
    create policy "Allow anon read discom_formats"
      on public.discom_formats
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'discom_formats'
      and policyname = 'Allow anon insert discom_formats'
  ) then
    create policy "Allow anon insert discom_formats"
      on public.discom_formats
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'discom_formats'
      and policyname = 'Allow anon update discom_formats'
  ) then
    create policy "Allow anon update discom_formats"
      on public.discom_formats
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
