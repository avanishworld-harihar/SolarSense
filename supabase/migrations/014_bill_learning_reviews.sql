-- Pending Super Admin approval before DISCOM bill-profile "learned rules" apply.

create table if not exists public.bill_learning_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending',

  state text not null,
  discom text not null,
  history_window_months int not null,
  required_bills int not null,
  confidence numeric,
  source text,

  metadata jsonb,

  reviewed_at timestamptz,
  reviewed_by text,
  review_note text
);

create index if not exists bill_learning_reviews_status_idx
  on public.bill_learning_reviews (status, created_at desc);

comment on table public.bill_learning_reviews is
  'Queued self-learning profile updates from smart bill scans; Super Admin approves before upsert to discom_bill_profiles.';
