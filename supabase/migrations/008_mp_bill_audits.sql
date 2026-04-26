-- Sol.52: MP bill audit results table (FY 2025-26 calculation engine).
-- One row per audit run. `full_report` mirrors the engine's typed JSON for
-- forward-compat queries even when individual columns lag the schema.

create table if not exists public.mp_bill_audits (
  id uuid primary key default gen_random_uuid(),
  audit_ref text unique not null,
  schema_version text not null default 'mp.audit/2025-26.v1',
  generated_at timestamptz not null default now(),

  client_ref text,
  lead_id text,
  customer_id text,

  state text,
  discom_code text,
  zone_code text,
  discom_confidence numeric,
  tariff_category text,
  category_confidence numeric,
  consumer_id text,
  meter_number text,
  connection_date text,
  sanctioned_load_kw numeric,
  contract_demand_kva numeric,
  phase text,
  area text,
  billing_month text,
  billing_period_from date,
  billing_period_to date,

  units_metered numeric,
  units_history numeric,
  units_chosen numeric,
  units_source text,
  units_consistent boolean,
  units_inconsistency_note text,

  energy_charge_inr numeric,
  fixed_charge_inr numeric,
  fppas_inr numeric,
  fppas_used_pct numeric,
  electricity_duty_inr numeric,
  subsidy_inr numeric,
  online_rebate_inr numeric,
  advance_credit_inr numeric,
  arrear_inr numeric,
  gross_payable_inr numeric,
  net_payable_inr numeric,

  printed_energy_inr numeric,
  printed_fixed_inr numeric,
  printed_fppas_inr numeric,
  printed_subsidy_inr numeric,
  printed_arrear_inr numeric,
  printed_received_inr numeric,
  printed_current_month_bill_inr numeric,
  printed_total_payable_inr numeric,
  printed_total_till_due_inr numeric,
  printed_total_after_due_inr numeric,
  printed_nfp boolean,

  validation_reference_field text,
  validation_reference_inr numeric,
  validation_calculated_inr numeric,
  validation_delta_inr numeric,
  validation_delta_pct numeric,
  validation_status text,
  primary_reason text,
  reason_explanations jsonb,

  risk_flags jsonb,
  narrative_md text,
  full_report jsonb not null
);

create index if not exists mp_bill_audits_generated_at_idx on public.mp_bill_audits (generated_at desc);
create index if not exists mp_bill_audits_discom_idx on public.mp_bill_audits (discom_code);
create index if not exists mp_bill_audits_category_idx on public.mp_bill_audits (tariff_category);
create index if not exists mp_bill_audits_consumer_idx on public.mp_bill_audits (consumer_id);
create index if not exists mp_bill_audits_status_idx on public.mp_bill_audits (validation_status);

comment on table public.mp_bill_audits is 'Sol.52 MP audit engine output (per bill). Each row mirrors MpBillAuditReport from lib/mp-bill-audit.ts.';

alter table public.mp_bill_audits enable row level security;
-- service_role inserts; downstream read policies can be added as installer dashboards mature.
