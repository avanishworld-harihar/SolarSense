-- Site survey gate for public web proposal (survey / workflow page visibility).
alter table public.leads
  add column if not exists survey_status text;

comment on column public.leads.survey_status is
  'CRM: not_started | scheduled | complete — when complete, public proposal shows the survey & install workflow page.';
