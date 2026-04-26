import type { ParsedBillShape } from "@/lib/bill-parse";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { MonthlyUnits, SolarResult } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

type SaveBillUploadInput = {
  clientRef?: string | null;
  leadId?: string | null;
  mimeType?: string | null;
  discomCode?: string | null;
  parsedBill: ParsedBillShape;
  monthlyUnits?: Partial<MonthlyUnits> | Record<string, number> | null;
};

type SaveCalculationInput = {
  clientRef: string;
  leadId?: string | null;
  monthlyUnits: MonthlyUnits;
  result: SolarResult;
  stateForSizing?: string | null;
  discom?: string | null;
  tariffLabel?: string | null;
  manualSnapshot?: Record<string, string> | null;
  latestBill?: ParsedBillShape | null;
  previousBill?: ParsedBillShape | null;
};

type SnapshotOutput = {
  latestBillUpload: {
    id: string;
    savedAt: string | null;
    parsedBill: ParsedBillShape | null;
    monthlyUnits: Partial<MonthlyUnits> | Record<string, number> | null;
  } | null;
  latestCalculation: {
    id: string;
    savedAt: string | null;
    monthlyUnits: MonthlyUnits | null;
    result: SolarResult | null;
    manualSnapshot: Record<string, string> | null;
    latestBill: ParsedBillShape | null;
    previousBill: ParsedBillShape | null;
  } | null;
};

function writeClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

function cleanString(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function normalizeMonthlyUnits(
  input?: Partial<MonthlyUnits> | Record<string, number | string | null> | ParsedBillShape["months"] | null
): MonthlyUnits | null {
  if (!input) return null;
  const out = {} as MonthlyUnits;
  let hasAny = false;
  for (const key of MONTH_KEYS) {
    const raw = input[key];
    const n = typeof raw === "number" ? raw : Number(raw ?? 0);
    const safe = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    out[key] = safe;
    if (safe > 0) hasAny = true;
  }
  return hasAny ? out : null;
}

function parseJsonLike<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function firstString(row: Row, keys: string[]): string | null {
  for (const key of keys) {
    const v = row[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function firstObject<T>(row: Row, keys: string[]): T | null {
  for (const key of keys) {
    const obj = parseJsonLike<T>(row[key]);
    if (obj && typeof obj === "object") return obj;
  }
  return null;
}

function missingColumn(errMessage: string): string | null {
  const match = /Could not find the '([^']+)' column/i.exec(errMessage);
  return match?.[1] ?? null;
}

async function insertAdaptive(client: SupabaseClient, table: string, payload: Row): Promise<{ ok: boolean; row?: Row }> {
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 30 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { data, error } = await client.from(table).insert(attempt).select("*").single();
    if (!error && data) return { ok: true, row: data as Row };
    if (!error && !data) return { ok: true };
    if (!error) return { ok: false };
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    return { ok: false };
  }
  return { ok: false };
}

async function recentRows(client: SupabaseClient, table: string): Promise<Row[]> {
  const orderCandidates = ["created_at", "scanned_at", "completed_at", "updated_at", "id"];
  for (const col of orderCandidates) {
    const { data, error } = await client.from(table).select("*").order(col, { ascending: false }).limit(30);
    if (!error && data) return data as Row[];
  }
  const { data } = await client.from(table).select("*").limit(30);
  return (data as Row[] | null) ?? [];
}

function rowMatches(row: Row, clientRef: string, leadId?: string | null): boolean {
  const ref = clientRef.trim();
  const lead = leadId?.trim();
  const rowRef = firstString(row, ["client_ref", "client_id", "session_id", "device_ref", "device_id", "ref"]);
  const rowLead = firstString(row, ["lead_id", "customer_id", "customer_ref"]);

  if (lead && rowLead && rowLead === lead) return true;
  if (rowRef && rowRef === ref) return true;
  return false;
}

function rowSavedAt(row: Row): string | null {
  return firstString(row, ["created_at", "scanned_at", "completed_at", "updated_at"]);
}

export async function saveBillUploadRecord(input: SaveBillUploadInput): Promise<boolean> {
  const client = writeClient();
  if (!client) return false;

  const monthlyUnits = normalizeMonthlyUnits(input.monthlyUnits ?? input.parsedBill.months);
  const payload: Row = {
    lead_id: cleanString(input.leadId),
    customer_id: cleanString(input.leadId),
    client_ref: cleanString(input.clientRef),
    source: "gemini_scan",
    mime_type: cleanString(input.mimeType),
    discom: cleanString(input.discomCode ?? input.parsedBill.discom),
    state: cleanString(input.parsedBill.state),
    bill_data: input.parsedBill as Row,
    parsed_bill: input.parsedBill as Row,
    extracted_data: input.parsedBill as Row,
    monthly_units: monthlyUnits,
    scan_payload: {
      discom: input.parsedBill.discom ?? null,
      state: input.parsedBill.state ?? null,
      bill_month: input.parsedBill.bill_month ?? null
    },
    scanned_at: new Date().toISOString()
  };

  return (await insertAdaptive(client, "bill_uploads", payload)).ok;
}

export async function saveCalculationRecord(input: SaveCalculationInput): Promise<boolean> {
  const client = writeClient();
  if (!client) return false;

  const payload: Row = {
    lead_id: cleanString(input.leadId),
    customer_id: cleanString(input.leadId),
    client_ref: cleanString(input.clientRef),
    source: "proposal_flow",
    state: cleanString(input.stateForSizing),
    discom: cleanString(input.discom),
    tariff_label: cleanString(input.tariffLabel),
    monthly_units: normalizeMonthlyUnits(input.monthlyUnits),
    result_json: input.result as unknown as Row,
    calculation_result: input.result as unknown as Row,
    input_snapshot: {
      manual: input.manualSnapshot ?? {},
      latest_bill: input.latestBill ?? null,
      previous_bill: input.previousBill ?? null
    },
    customer_snapshot: input.manualSnapshot ?? {},
    latest_bill: input.latestBill ?? null,
    previous_bill: input.previousBill ?? null,
    completed_at: new Date().toISOString()
  };

  return (await insertAdaptive(client, "calculations", payload)).ok;
}

export async function getLatestPersistenceSnapshot(clientRef: string, leadId?: string | null): Promise<SnapshotOutput> {
  const client = writeClient();
  if (!client) return { latestBillUpload: null, latestCalculation: null };

  const [billRows, calcRows] = await Promise.all([recentRows(client, "bill_uploads"), recentRows(client, "calculations")]);
  const billRow = billRows.find((row) => rowMatches(row, clientRef, leadId)) ?? null;
  const calcRow = calcRows.find((row) => rowMatches(row, clientRef, leadId)) ?? null;

  const latestBillUpload = billRow
    ? {
        id: String(billRow.id ?? ""),
        savedAt: rowSavedAt(billRow),
        parsedBill: firstObject<ParsedBillShape>(billRow, ["parsed_bill", "bill_data", "extracted_data", "scan_payload"]),
        monthlyUnits: firstObject<Partial<MonthlyUnits>>(billRow, ["monthly_units", "months"])
      }
    : null;

  const latestCalculation = calcRow
    ? {
        id: String(calcRow.id ?? ""),
        savedAt: rowSavedAt(calcRow),
        monthlyUnits: firstObject<MonthlyUnits>(calcRow, ["monthly_units", "months"]),
        result: firstObject<SolarResult>(calcRow, ["result_json", "calculation_result", "result"]),
        manualSnapshot: firstObject<Record<string, string>>(calcRow, ["customer_snapshot", "manual_snapshot"]),
        latestBill: firstObject<ParsedBillShape>(calcRow, ["latest_bill"]),
        previousBill: firstObject<ParsedBillShape>(calcRow, ["previous_bill"])
      }
    : null;

  return { latestBillUpload, latestCalculation };
}
