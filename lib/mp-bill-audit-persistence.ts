/**
 * Persistence helper: pushes one MpBillAuditReport row into Supabase.
 *
 * Designed to be schema-resilient (uses the same `insertAdaptive` pattern as
 * `lib/supabase-persistence.ts`) so it can survive minor column drift in the
 * `mp_bill_audits` table without breaking the audit endpoint.
 */

import type { MpBillAuditReport } from "@/lib/mp-bill-audit";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

function writeClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

function missingColumn(message: string): string | null {
  const m = /Could not find the '([^']+)' column/i.exec(message);
  return m?.[1] ?? null;
}

async function insertAdaptive(client: SupabaseClient, table: string, payload: Row): Promise<boolean> {
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 30 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { error } = await client.from(table).insert(attempt);
    if (!error) return true;
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    console.warn("[mp-bill-audit-persistence] insert failed:", error.message);
    return false;
  }
  return false;
}

export type SaveMpBillAuditInput = {
  report: MpBillAuditReport;
  clientRef?: string | null;
  leadId?: string | null;
};

export async function saveMpBillAuditRecord(input: SaveMpBillAuditInput): Promise<boolean> {
  const client = writeClient();
  if (!client) return false;
  const r = input.report;

  const payload: Row = {
    audit_ref: r.auditRef,
    schema_version: r.schemaVersion,
    generated_at: r.generatedAtIso,
    client_ref: input.clientRef?.trim() || null,
    lead_id: input.leadId?.trim() || null,
    customer_id: input.leadId?.trim() || null,

    state: r.identification.detectedState,
    discom_code: r.identification.detectedDiscom,
    zone_code: r.identification.detectedZone,
    discom_confidence: r.identification.discomConfidence,
    tariff_category: r.identification.detectedCategory,
    category_confidence: r.identification.categoryConfidence,
    consumer_id: r.identification.consumerId,
    meter_number: r.identification.meterNumber,
    connection_date: r.identification.connectionDate,
    sanctioned_load_kw: r.identification.sanctionedLoadKw,
    contract_demand_kva: r.identification.contractDemandKva,
    phase: r.identification.phase,
    area: r.identification.area,
    billing_month: r.identification.billingMonth,
    billing_period_from: r.identification.billingPeriodFromIso,
    billing_period_to: r.identification.billingPeriodToIso,

    units_metered: r.unitsExtraction.meteredUnits,
    units_history: r.unitsExtraction.monthsHistoryUnits,
    units_chosen: r.unitsExtraction.chosenUnits,
    units_source: r.unitsExtraction.unitsSource,
    units_consistent: r.unitsExtraction.unitsConsistent,
    units_inconsistency_note: r.unitsExtraction.inconsistencyNote,

    energy_charge_inr: r.calculation.breakdown.energyCharge,
    fixed_charge_inr: r.calculation.breakdown.fixedCharge,
    fppas_inr: r.calculation.breakdown.fppasCharge,
    fppas_used_pct: r.calculation.fppasUsedPct,
    electricity_duty_inr: r.calculation.breakdown.electricityDuty,
    subsidy_inr: r.calculation.breakdown.subsidyCredit,
    online_rebate_inr: r.calculation.breakdown.onlineRebate,
    advance_credit_inr: r.calculation.breakdown.advanceCredit,
    arrear_inr: r.calculation.breakdown.arrearAdded,
    gross_payable_inr: r.calculation.breakdown.grossPayable,
    net_payable_inr: r.calculation.breakdown.netPayable,

    printed_energy_inr: r.printed.energyChargeInr,
    printed_fixed_inr: r.printed.fixedChargeInr,
    printed_fppas_inr: r.printed.fppasInr,
    printed_subsidy_inr: r.printed.subsidyInr,
    printed_arrear_inr: r.printed.arrearInr,
    printed_received_inr: r.printed.receivedAgainstBillInr,
    printed_current_month_bill_inr: r.printed.currentMonthBillInr,
    printed_total_payable_inr: r.printed.totalAmountPayableInr,
    printed_total_till_due_inr: r.printed.totalAmountTillDueInr,
    printed_total_after_due_inr: r.printed.totalAmountAfterDueInr,
    printed_nfp: r.printed.nfp,

    validation_reference_field: r.validation.referenceField,
    validation_reference_inr: r.validation.referenceInr,
    validation_calculated_inr: r.validation.calculatedInr,
    validation_delta_inr: r.validation.deltaInr,
    validation_delta_pct: r.validation.deltaPct,
    validation_status: r.validation.status,
    primary_reason: r.validation.primaryReason,
    reason_explanations: r.validation.reasonExplanations,

    risk_flags: r.riskFlags,
    narrative_md: r.narrativeMd,
    full_report: r as unknown as Row
  };

  return insertAdaptive(client, "mp_bill_audits", payload);
}
