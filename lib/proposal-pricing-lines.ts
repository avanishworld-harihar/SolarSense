import {
  defaultCatalogCategoryForLineKind,
  EPC_COMPONENT_CATEGORIES,
  type EpcComponentCategory
} from "@/lib/epc-component-catalog";
import type { PricingLineKind } from "@/lib/pricing-line-kinds";
import { PRICING_LINE_KINDS } from "@/lib/pricing-line-kinds";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";

export type { PricingLineKind };
export { PRICING_LINE_KINDS };

export type PricingLineItem = {
  id: string;
  kind: PricingLineKind;
  label: string;
  brand: string;
  quantity: number;
  unit_rate_inr: number;
  /** EPC master catalog — drives future BOM / marketplace SKUs. */
  catalog_category?: EpcComponentCategory | null;
};

export const PANEL_BRAND_PRESETS = ["Waaree", "Adani", "Longi", "Jinko"] as const;
export const INVERTER_BRAND_PRESETS = ["Growatt", "Sungrow", "Solis"] as const;

export function newPricingLineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultLabelForKind(kind: PricingLineKind): string {
  switch (kind) {
    case "panels":
      return "Solar panels";
    case "inverter":
      return "Inverter";
    case "structure":
      return "Structure";
    case "installation":
      return "Installation";
    case "battery":
      return "Battery";
    case "electricals":
      return "Electricals";
    case "subsidy":
      return "Subsidy";
    case "discount":
      return "Discount";
    default:
      return "Custom line";
  }
}

export function lineItemTotalInr(item: PricingLineItem): number {
  const q = Math.max(0, Number(item.quantity) || 0);
  const r = Math.max(0, Number(item.unit_rate_inr) || 0);
  return Math.round(q * r);
}

const HARDWARE_KINDS = new Set<PricingLineKind>(["panels", "inverter", "battery", "electricals", "custom"]);

export function rollupLineItemsToBuckets(lines: PricingLineItem[]): {
  hardware_inr: number;
  installation_inr: number;
  structure_inr: number;
  subsidy_inr: number;
  discount_inr: number;
} {
  let hardware_inr = 0;
  let installation_inr = 0;
  let structure_inr = 0;
  let subsidy_inr = 0;
  let discount_inr = 0;
  for (const L of lines) {
    const t = lineItemTotalInr(L);
    if (L.kind === "subsidy") subsidy_inr += t;
    else if (L.kind === "discount") discount_inr += t;
    else if (L.kind === "structure") structure_inr += t;
    else if (L.kind === "installation") installation_inr += t;
    else if (HARDWARE_KINDS.has(L.kind)) hardware_inr += t;
  }
  return {
    hardware_inr: Math.round(hardware_inr),
    installation_inr: Math.round(installation_inr),
    structure_inr: Math.round(structure_inr),
    subsidy_inr: Math.round(subsidy_inr),
    discount_inr: Math.round(discount_inr)
  };
}

/** Gross ₹/W before subsidy/discount (derived). */
function wattsFromSystemKw(systemKw: number): number {
  const kw = Math.max(0, Number(systemKw) || 0);
  return Math.round(kw * 1000);
}

function grossSubtotalFromBuckets(b: Pick<ProposalPricingRow, "hardware_inr" | "installation_inr" | "structure_inr">): number {
  return Math.round(
    Math.max(0, Number(b.hardware_inr) || 0) +
      Math.max(0, Number(b.installation_inr) || 0) +
      Math.max(0, Number(b.structure_inr) || 0)
  );
}

function computedFinalFromBuckets(row: ProposalPricingRow): number {
  if (row.manual_final_override) return Math.max(0, Math.round(Number(row.final_amount_inr) || 0));
  const gross = grossSubtotalFromBuckets(row);
  const base = gross - Math.max(0, Number(row.subsidy_inr) || 0) - Math.max(0, Number(row.discount_inr) || 0);
  return Math.max(0, Math.round(base));
}

export function effectiveGrossPricePerWattInr(systemKw: number, grossSubtotal: number): number {
  const w = wattsFromSystemKw(systemKw);
  if (w <= 0) return 0;
  return Math.round((Math.max(0, grossSubtotal) / w) * 10000) / 10000;
}

export function effectiveNetPricePerWattInr(systemKw: number, netPayable: number): number {
  const w = wattsFromSystemKw(systemKw);
  if (w <= 0) return 0;
  return Math.round((Math.max(0, netPayable) / w) * 10000) / 10000;
}

export function defaultLineItemsFromSeed(opts: {
  hardware_inr: number;
  installation_inr: number;
  structure_inr: number;
  subsidy_inr: number;
  discount_inr: number;
  panelBrandHint?: string | null;
}): PricingLineItem[] {
  const b = (opts.panelBrandHint ?? "").trim();
  const seed = (
    kind: PricingLineKind,
    extra: Partial<Pick<PricingLineItem, "brand" | "unit_rate_inr">>
  ): PricingLineItem => ({
    id: newPricingLineId(),
    kind,
    label: defaultLabelForKind(kind),
    brand: extra.brand ?? "",
    quantity: 1,
    unit_rate_inr: extra.unit_rate_inr ?? 0,
    catalog_category: defaultCatalogCategoryForLineKind(kind)
  });
  return [
    seed("panels", { brand: b, unit_rate_inr: Math.max(0, Math.round(opts.hardware_inr)) }),
    seed("inverter", {}),
    seed("structure", { unit_rate_inr: Math.max(0, Math.round(opts.structure_inr)) }),
    seed("installation", { unit_rate_inr: Math.max(0, Math.round(opts.installation_inr)) }),
    seed("battery", {}),
    seed("electricals", {}),
    seed("subsidy", { unit_rate_inr: Math.max(0, Math.round(opts.subsidy_inr)) }),
    seed("discount", { unit_rate_inr: Math.max(0, Math.round(opts.discount_inr)) })
  ];
}

/** Use persisted lines when present; otherwise infer rows from legacy scalars. */
export function hydrateLineItems(row: ProposalPricingRow): PricingLineItem[] {
  const raw = row.line_items;
  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeLineItems(raw as unknown[]);
  }
  return defaultLineItemsFromSeed({
    hardware_inr: row.hardware_inr,
    installation_inr: row.installation_inr,
    structure_inr: row.structure_inr,
    subsidy_inr: row.subsidy_inr,
    discount_inr: row.discount_inr,
    panelBrandHint: null
  });
}

function parseCatalogCategory(raw: unknown): EpcComponentCategory | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  return (EPC_COMPONENT_CATEGORIES as readonly string[]).includes(raw) ? (raw as EpcComponentCategory) : undefined;
}

export function normalizeLineItems(raw: unknown[]): PricingLineItem[] {
  const out: PricingLineItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const kind = o.kind;
    if (typeof kind !== "string" || !PRICING_LINE_KINDS.includes(kind as PricingLineKind)) continue;
    const id = typeof o.id === "string" && o.id ? o.id : newPricingLineId();
    const label = typeof o.label === "string" ? o.label : defaultLabelForKind(kind as PricingLineKind);
    const brand = typeof o.brand === "string" ? o.brand : "";
    const quantity = typeof o.quantity === "number" && Number.isFinite(o.quantity) ? o.quantity : Number(o.quantity) || 0;
    const unit_rate_inr =
      typeof o.unit_rate_inr === "number" && Number.isFinite(o.unit_rate_inr) ? o.unit_rate_inr : Number(o.unit_rate_inr) || 0;
    let catalog_category = parseCatalogCategory(o.catalog_category);
    if (catalog_category === undefined) {
      catalog_category = defaultCatalogCategoryForLineKind(kind as PricingLineKind);
    }
    out.push({ id, kind: kind as PricingLineKind, label, brand, quantity, unit_rate_inr, catalog_category });
  }
  return out.length > 0 ? out : defaultLineItemsFromSeed({ hardware_inr: 0, installation_inr: 0, structure_inr: 0, subsidy_inr: 0, discount_inr: 0 });
}

export function proposalPricingRowFromLineItems(
  base: ProposalPricingRow,
  lines: PricingLineItem[],
  opts: {
    system_kw?: number;
    manual_final_override?: boolean;
    final_amount_inr?: number;
  } = {}
): ProposalPricingRow {
  const system_kw = opts.system_kw ?? base.system_kw;
  const buckets = rollupLineItemsToBuckets(lines);
  const draft: ProposalPricingRow = {
    ...base,
    system_kw,
    ...buckets,
    line_items: lines,
    price_per_watt_inr: effectiveGrossPricePerWattInr(system_kw, grossSubtotalFromBuckets(buckets)),
    manual_final_override: opts.manual_final_override ?? base.manual_final_override
  };
  if (draft.manual_final_override) {
    if (opts.final_amount_inr != null) {
      draft.final_amount_inr = Math.max(0, Math.round(opts.final_amount_inr));
    }
  } else {
    draft.final_amount_inr = computedFinalFromBuckets(draft);
  }
  return draft;
}
