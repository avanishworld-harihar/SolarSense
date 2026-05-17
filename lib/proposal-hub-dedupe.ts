import type { ProposalHubDealRow } from "@/components/proposals/proposal-hub-deal-list";

function normName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Keep only the newest proposal per CRM lead, or per customer name when no lead id. */
export function dedupeLatestProposals(rows: ProposalHubDealRow[]): ProposalHubDealRow[] {
  const byLead = new Map<string, ProposalHubDealRow>();
  const byName = new Map<string, ProposalHubDealRow>();
  const orphans: ProposalHubDealRow[] = [];

  for (const row of rows) {
    const ts = new Date(row.generated_at).getTime();
    if (row.lead_id) {
      const prev = byLead.get(row.lead_id);
      if (!prev || ts > new Date(prev.generated_at).getTime()) byLead.set(row.lead_id, row);
      continue;
    }
    const key = normName(row.customer_name);
    if (!key) {
      orphans.push(row);
      continue;
    }
    const prev = byName.get(key);
    if (!prev || ts > new Date(prev.generated_at).getTime()) byName.set(key, row);
  }

  return [...byLead.values(), ...byName.values(), ...orphans].sort(
    (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
  );
}

export function countHiddenByDedupe(all: ProposalHubDealRow[], visible: ProposalHubDealRow[]): number {
  return Math.max(0, all.length - visible.length);
}
