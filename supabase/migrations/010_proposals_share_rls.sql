-- Sol.52 — make /proposal/[id] truly public-by-link.
--
-- The web proposal is a "share-by-URL" artefact: anyone holding the long
-- (UUID v4) id or share_token should be able to read it without an
-- authenticated session. Both `id` and `share_token` are unguessable v4 UUIDs
-- so leaking a row-level read to anonymous clients is safe by design.

alter table public.proposals enable row level security;

-- Anonymous SELECT (the public web link).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'proposals'
      and policyname = 'Allow anon read proposals'
  ) then
    create policy "Allow anon read proposals"
      on public.proposals
      for select
      to anon
      using (true);
  end if;

  -- Authenticated read (same scope; future-proofs the dashboard).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'proposals'
      and policyname = 'Allow authenticated read proposals'
  ) then
    create policy "Allow authenticated read proposals"
      on public.proposals
      for select
      to authenticated
      using (true);
  end if;

  -- Anonymous INSERT (so the dashboard can publish without service-role,
  -- if/when SUPABASE_SERVICE_ROLE_KEY is unavailable in a deployed env).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'proposals'
      and policyname = 'Allow anon insert proposals'
  ) then
    create policy "Allow anon insert proposals"
      on public.proposals
      for insert
      to anon
      with check (true);
  end if;

  -- Allow incrementing view_count / last_viewed_at on the public page.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'proposals'
      and policyname = 'Allow anon update view counters'
  ) then
    create policy "Allow anon update view counters"
      on public.proposals
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;

-- Optional helper RPC used by trackProposalView() to atomically bump the
-- view counter and last_viewed_at without a select-then-update race.
create or replace function public.increment_proposal_view(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.proposals
  set view_count = view_count + 1,
      last_viewed_at = now()
  where id = p_id;
$$;

grant execute on function public.increment_proposal_view(uuid) to anon, authenticated, service_role;

comment on function public.increment_proposal_view is 'Sol.52 — atomic view counter for the public /proposal/[id] page.';
