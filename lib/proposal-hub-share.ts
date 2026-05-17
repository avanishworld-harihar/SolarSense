import type { ProposalHubDealRow } from "@/components/proposals/proposal-hub-deal-list";
import type { ProposalShareMetrics } from "@/lib/proposal-share-actions";

export function shareMetricsFromHubRow(row: ProposalHubDealRow): ProposalShareMetrics {
  return {
    customerName: row.customer_name,
    systemKw: row.system_kw,
    netCostInr: row.final_amount_inr ?? 0,
    annualSavingInr: row.annual_saving_inr ?? 0,
    paybackLabel: "—"
  };
}
