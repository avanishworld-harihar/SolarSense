-- Ground-truth bill scans for future Gemini / model fine-tuning (installer "Verify" flow).
-- Inserts and storage uploads are intended to run server-side with service_role (bypasses RLS).

create table if not exists public.verified_bills_training (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  storage_path text not null,
  mime_type text not null,
  bill_data jsonb not null,
  monthly_units jsonb,
  notes text,
  app_version text
);

comment on table public.verified_bills_training is 'Installer-verified bill parse + original file path for ML training datasets.';

create index if not exists verified_bills_training_created_at_idx
  on public.verified_bills_training (created_at desc);

alter table public.verified_bills_training enable row level security;

-- No anon/authenticated policies: only service_role (server) should insert/select for exports.
-- Add read policies later for a dedicated admin role if needed.

insert into storage.buckets (id, name, public)
values ('verified-bills-training', 'verified-bills-training', false)
on conflict (id) do nothing;
