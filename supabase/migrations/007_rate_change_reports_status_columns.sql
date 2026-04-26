alter table if exists public.rate_change_reports
  add column if not exists status text not null default 'pending_admin_approval',
  add column if not exists detected_rates jsonb null,
  add column if not exists database_rates jsonb null,
  add column if not exists pending_admin_approval boolean not null default true,
  add column if not exists admin_alert_required boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();
