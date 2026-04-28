import type { ParsedBillShape } from "@/lib/bill-parse";

/** Manual entry on the proposal screen; merged over OCR/Gemini bill parse for PDF/HTML export. */
export type ManualProposalCustomer = {
  /** CRM / who to call — from selected lead or walk-in entry */
  leadContactName: string;
  /** Contact / CRM mobile number */
  leadPhone: string;
  /** Registered mobile number printed on electricity bill (may differ from lead phone) */
  billPhone: string;
  /** Name printed on electricity bill — may differ from lead contact */
  officialBillName: string;
  city: string;
  discom: string;
  state: string;
  consumerId: string;
  meterNumber: string;
  connectionDate: string;
  phase: string;
  connectionType: string;
  sanctionedLoad: string;
  billingAddress: string;
  tariffCategory: string;
  /** Printed purpose/use — aligns with OCR purpose_of_supply. */
  purposeOfSupply: string;
  /** Contract demand as printed (kVA); optional for demand-based LV2. */
  contractDemandKva: string;
};

function coalesce(manual: string, parsed?: string) {
  const t = manual.trim();
  if (t) return t;
  const p = parsed?.trim();
  return p || undefined;
}

function manualHasAny(manual: ManualProposalCustomer) {
  return Object.values(manual).some((v) => String(v ?? "").trim().length > 0);
}

/** Prefer typed manual fields; fall back to parsed bill. */
export function mergeCustomerForProposal(
  manual: ManualProposalCustomer,
  parsed: ParsedBillShape | null
): ParsedBillShape | null {
  if (!parsed && !manualHasAny(manual)) return null;
  return {
    ...parsed,
    name: coalesce(manual.officialBillName, parsed?.name),
    district: coalesce(manual.city, parsed?.district),
    discom: coalesce(manual.discom, parsed?.discom),
    state: coalesce(manual.state, parsed?.state),
    consumer_id: coalesce(manual.consumerId, parsed?.consumer_id),
    meter_number: coalesce(manual.meterNumber, parsed?.meter_number),
    connection_date: coalesce(manual.connectionDate, parsed?.connection_date),
    phase: coalesce(manual.phase, parsed?.phase),
    connection_type: coalesce(manual.connectionType, parsed?.connection_type),
    sanctioned_load: coalesce(manual.sanctionedLoad, parsed?.sanctioned_load),
    address: coalesce(manual.billingAddress, parsed?.address),
    tariff_category: coalesce(manual.tariffCategory, parsed?.tariff_category),
    purpose_of_supply: coalesce(
      manual.purposeOfSupply,
      (parsed?.purpose_of_supply ?? parsed?.connection_type) as string | undefined
    ),
    contract_demand_kva:
      manual.contractDemandKva.trim().length > 0
        ? manual.contractDemandKva.trim()
        : parsed?.contract_demand_kva ?? undefined,
    bill_month: parsed?.bill_month,
    months: parsed?.months
  };
}
