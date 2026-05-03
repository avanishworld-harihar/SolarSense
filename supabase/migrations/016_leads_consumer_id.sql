-- Optional DISCOM consumer number on CRM leads (manual intake / edit).
alter table public.leads
  add column if not exists consumer_id text;

comment on column public.leads.consumer_id is
  'Optional electricity consumer / CA number from the bill; empty is allowed.';
