/** Lead row shape from `/api/customers` / Supabase `leads`. */
export type CustomerLead = {
  id: string;
  name: string;
  city: string;
  discom: string;
  monthly_bill: number;
  status: string;
  phone?: string | null;
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
