import { z } from "zod";
import { epcComponentCategorySchema, type EpcComponentCategory } from "@/lib/epc-component-catalog";
import { PRICING_LINE_KINDS, type PricingLineKind } from "@/lib/pricing-line-kinds";

/** Row shape for `public.proposal_pricing` (normalized commercial source). */
const n = z.coerce.number();
const b = z.coerce.boolean();

export const pricingLineItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(PRICING_LINE_KINDS),
  label: z.string(),
  brand: z.string(),
  quantity: n,
  unit_rate_inr: n,
  /** EPC BOM taxonomy — optional; defaults derived from `kind` when absent. */
  catalog_category: epcComponentCategorySchema.nullable().optional()
});

export const proposalPricingRowSchema = z.object({
  id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  system_kw: n,
  price_per_watt_inr: n,
  hardware_inr: n,
  installation_inr: n,
  structure_inr: n,
  subsidy_inr: n,
  discount_inr: n,
  final_amount_inr: n,
  manual_final_override: b,
  updated_at: z.string(),
  line_items: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(pricingLineItemSchema)
  ) as z.ZodType<
    Array<{
      id: string;
      kind: PricingLineKind;
      label: string;
      brand: string;
      quantity: number;
      unit_rate_inr: number;
      catalog_category?: EpcComponentCategory | null;
    }>
  >
});

export type ProposalPricingRow = z.infer<typeof proposalPricingRowSchema>;

const pn = z.coerce.number();

export const proposalPricingPatchSchema = z.object({
  system_kw: pn.min(0).max(500).optional(),
  /** Primary UX: full line table replaces scalar editing. */
  line_items: z.array(pricingLineItemSchema).min(1).optional(),
  price_per_watt_inr: pn.min(0).max(5000).optional(),
  hardware_inr: pn.min(0).max(100_000_000).optional(),
  installation_inr: pn.min(0).max(100_000_000).optional(),
  structure_inr: pn.min(0).max(100_000_000).optional(),
  subsidy_inr: pn.min(0).max(5_000_000).optional(),
  discount_inr: pn.min(0).max(100_000_000).optional(),
  final_amount_inr: pn.min(0).max(100_000_000).optional(),
  manual_final_override: z.boolean().optional()
});

export type ProposalPricingPatch = z.infer<typeof proposalPricingPatchSchema>;
