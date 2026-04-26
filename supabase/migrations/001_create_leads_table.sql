create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  discom text not null,
  monthly_bill numeric,
  status text not null default 'lead',
  phone text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and policyname = 'Allow anon read leads'
  ) then
    create policy "Allow anon read leads"
      on public.leads
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and policyname = 'Allow anon insert leads'
  ) then
    create policy "Allow anon insert leads"
      on public.leads
      for insert
      to anon
      with check (true);
  end if;
end
$$;
