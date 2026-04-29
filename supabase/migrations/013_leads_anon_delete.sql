-- Allow anon role (used by Next.js API with anon key) to delete leads from CRM.
-- Projects referencing the lead use ON DELETE CASCADE (004_projects_pipeline.sql).

alter table public.leads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and policyname = 'Allow anon delete leads'
  ) then
    create policy "Allow anon delete leads"
      on public.leads
      for delete
      to anon
      using (true);
  end if;
end
$$;
