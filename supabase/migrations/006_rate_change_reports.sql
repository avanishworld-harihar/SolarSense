create extension if not exists pgcrypto;

create table if not exists public.rate_change_reports (
  id uuid primary key default gen_random_uuid(),
  installer_name text not null,
  installer_state text not null,
  active_tariff text not null,
  report_note text null,
  source text not null default 'more_manual',
  status text not null default 'pending_admin_approval',
  detected_rates jsonb null,
  database_rates jsonb null,
  pending_admin_approval boolean not null default true,
  admin_alert_required boolean not null default true,
  reported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_change_reports_state on public.rate_change_reports(installer_state);
create index if not exists idx_rate_change_reports_reported_at on public.rate_change_reports(reported_at desc);
