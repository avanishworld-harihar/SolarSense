import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { defaultProposalTemplateV1, normalizeProposalTemplateV1, parseProposalTemplateV1, type ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import type { ProposalBlockId } from "@/lib/proposal-block-registry";

/**
 * Ensures `proposalLayout` exists on deck input for downstream renderers / exporters.
 * Non-breaking: if missing or invalid, injects defaults without mutating caller unless requested.
 */
export function getProposalLayout(ppt: PremiumProposalPptInput): ProposalTemplateV1 {
  const parsed = parseProposalTemplateV1(ppt.proposalLayout);
  if (!parsed) return defaultProposalTemplateV1();
  return normalizeProposalTemplateV1(parsed);
}

export function withDefaultProposalLayout(ppt: PremiumProposalPptInput): PremiumProposalPptInput {
  if (parseProposalTemplateV1(ppt.proposalLayout)) return ppt;
  return { ...ppt, proposalLayout: defaultProposalTemplateV1() };
}

export function getEnabledProposalBlocksInOrder(layout: ProposalTemplateV1): ProposalBlockId[] {
  return layout.blocks.filter((b) => b.enabled).map((b) => b.id);
}
