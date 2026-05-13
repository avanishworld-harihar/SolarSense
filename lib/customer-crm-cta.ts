import type { CustomerLead } from "@/lib/types";

export type CustomerCommercialCta = {
  labelKey: "customers_ctaCreateQuote" | "customers_ctaOpenProposal" | "customers_ctaOpenProject";
  href: string;
};

/**
 * Single commercial hand-off from CRM: no pricing/BOM here — only where to continue the deal.
 * - Active install → Projects ops board
 * - Latest saved proposal → commercial workspace
 * - Else → bill / quote builder entry
 */
export function resolveCustomerCommercialCta(customer: CustomerLead): CustomerCommercialCta {
  const stage = customer.customer_stage ?? "lead";
  if (stage === "active-project") {
    return { labelKey: "customers_ctaOpenProject", href: "/projects" };
  }
  const pid = customer.primary_proposal_id?.trim();
  if (pid) {
    return { labelKey: "customers_ctaOpenProposal", href: `/proposals/${pid}` };
  }
  return { labelKey: "customers_ctaCreateQuote", href: `/proposal?leadId=${encodeURIComponent(customer.id)}` };
}
