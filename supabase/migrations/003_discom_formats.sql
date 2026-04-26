-- Template memory: where consumption history lives on bills per DISCOM (feeds Gemini hints).

create table if not exists public.discom_formats (
  id uuid primary key default gen_random_uuid(),
  discom_code text not null unique,
  history_extraction_hint text not null,
  updated_at timestamptz not null default now()
);

comment on table public.discom_formats is 'Per-DISCOM hints for locating consumption history tables/charts on bills (Gemini prompt injection).';

alter table public.discom_formats enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
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
    select 1 from pg_policies
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
    select 1 from pg_policies
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
