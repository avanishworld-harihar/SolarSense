import { z } from "zod";

export const PROPOSAL_STATUS_IDS = ["draft", "sent", "viewed", "negotiation", "approved"] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUS_IDS)[number];

export const proposalStatusSchema = z.enum(PROPOSAL_STATUS_IDS);

export function normalizeProposalStatus(raw: string | null | undefined): ProposalStatus {
  const s = (raw ?? "draft").trim().toLowerCase();
  return PROPOSAL_STATUS_IDS.includes(s as ProposalStatus) ? (s as ProposalStatus) : "draft";
}

/** i18n key: `proposals_status_${id}` */
export const PROPOSAL_STATUS_ORDER: ProposalStatus[] = [
  "draft",
  "sent",
  "viewed",
  "negotiation",
  "approved"
];
