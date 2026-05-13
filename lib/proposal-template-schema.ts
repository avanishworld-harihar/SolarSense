import { z } from "zod";
import { proposalBlockIdSchema, type ProposalBlockId, DEFAULT_PROPOSAL_BLOCK_ORDER, PROPOSAL_BLOCK_REGISTRY } from "@/lib/proposal-block-registry";

export const proposalTemplateBlockSchema = z.object({
  id: proposalBlockIdSchema,
  enabled: z.boolean()
});

export type ProposalTemplateBlock = z.infer<typeof proposalTemplateBlockSchema>;

export const proposalTemplateV1Schema = z.object({
  version: z.literal(1),
  blocks: z.array(proposalTemplateBlockSchema).min(1)
});

export type ProposalTemplateV1 = z.infer<typeof proposalTemplateV1Schema>;

export function defaultProposalTemplateV1(): ProposalTemplateV1 {
  return {
    version: 1,
    blocks: DEFAULT_PROPOSAL_BLOCK_ORDER.map((id) => ({
      id,
      enabled: PROPOSAL_BLOCK_REGISTRY[id].defaultEnabled
    }))
  };
}

export function parseProposalTemplateV1(raw: unknown): ProposalTemplateV1 | null {
  const p = proposalTemplateV1Schema.safeParse(raw);
  return p.success ? p.data : null;
}

/** Dedupe by id, keep first occurrence; append any missing registry ids at end (enabled by default). */
export function normalizeProposalTemplateV1(input: ProposalTemplateV1): ProposalTemplateV1 {
  const seen = new Set<ProposalBlockId>();
  const blocks: ProposalTemplateBlock[] = [];
  for (const b of input.blocks) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    blocks.push({ id: b.id, enabled: b.enabled });
  }
  for (const id of DEFAULT_PROPOSAL_BLOCK_ORDER) {
    if (!seen.has(id)) {
      blocks.push({ id, enabled: PROPOSAL_BLOCK_REGISTRY[id].defaultEnabled });
    }
  }
  return { version: 1, blocks };
}
