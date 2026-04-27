/**
 * Lead row shape from `/api/customers` / Supabase `leads`.
 *
 * CRM v2 fields (`source`, `last_touched_at`, `state`, `email`) are optional
 * for back-compat with caches / pre-012 envs that haven't run the migration.
 */
export type CustomerLead = {
  id: string;
  name: string;
  city: string;
  discom: string;
  monthly_bill: number;
  status: string;
  phone?: string | null;
  /** CRM v2 — origin channel. Undefined means legacy row (treat as 'manual'). */
  source?: string | null;
  /** CRM v2 — ISO timestamp last touched (call/WA/status-change/inbound). */
  last_touched_at?: string | null;
  /** Indian state / UT. */
  state?: string | null;
  email?: string | null;
};

export type MonthKey = "jan" | "feb" | "mar" | "apr" | "may" | "jun" | "jul" | "aug" | "sep" | "oct" | "nov" | "dec";

export type MonthlyUnits = Record<MonthKey, number>;

export interface SolarResult {
  annualUnits: number;
  solarKw: number;
  panels: number;
  annualGeneration: number;
  currentMonthlyBill: number;
  newMonthlyBill: number;
  monthlySavings: number;
  annualSavings: number;
  grossCost: number;
  centralSubsidy: number;
  netCost: number;
  paybackYears: number;
  paybackDisplay: string;
  savings25yr: number;
  profit25yr: number;
}
