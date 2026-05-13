import type { PricingLineKind } from "@/lib/pricing-line-kinds";
import { z } from "zod";

/**
 * Master EPC component taxonomy — BOM / pricing alignment for marketplace & regional catalogs later.
 * Inspired by real quotations (material lists + turnkey BOQs): mixed units (per W, per kg, per m, nos).
 * Not a UI copy of any vendor PDF — structural categories only.
 */

export const EPC_COMPONENT_CATEGORIES = [
  "solar_panels",
  "inverters",
  "structure",
  "acdb",
  "dcdb",
  "cables",
  "earthing",
  "lightning_arrester",
  "net_meter",
  "installation",
  "misc_electricals",
  /** Optional rows common in field BOQs */
  "battery",
  "monitoring"
] as const;

export type EpcComponentCategory = (typeof EPC_COMPONENT_CATEGORIES)[number];

export const epcComponentCategorySchema = z.enum(
  EPC_COMPONENT_CATEGORIES as unknown as [EpcComponentCategory, ...EpcComponentCategory[]]
);

/** Typical commercial / measurement hint for dynamic BOM & future catalog mapping (not enforced in Phase 1). */
export type EpcBomUnitKind = "per_watt" | "per_kg" | "per_meter" | "per_set" | "nos" | "lump_sum";

export type EpcCategoryMeta = {
  id: EpcComponentCategory;
  /** Default unit story for auto-BOM / marketplace SKUs later */
  defaultUnitKind: EpcBomUnitKind;
  /** Future: FK to marketplace listing, regional price book, supplier org */
  marketplaceReady: boolean;
};

export const EPC_CATEGORY_REGISTRY: Record<EpcComponentCategory, EpcCategoryMeta> = {
  solar_panels: { id: "solar_panels", defaultUnitKind: "per_watt", marketplaceReady: true },
  inverters: { id: "inverters", defaultUnitKind: "nos", marketplaceReady: true },
  structure: { id: "structure", defaultUnitKind: "per_kg", marketplaceReady: true },
  acdb: { id: "acdb", defaultUnitKind: "nos", marketplaceReady: true },
  dcdb: { id: "dcdb", defaultUnitKind: "nos", marketplaceReady: true },
  cables: { id: "cables", defaultUnitKind: "per_meter", marketplaceReady: true },
  earthing: { id: "earthing", defaultUnitKind: "per_set", marketplaceReady: true },
  lightning_arrester: { id: "lightning_arrester", defaultUnitKind: "nos", marketplaceReady: true },
  net_meter: { id: "net_meter", defaultUnitKind: "nos", marketplaceReady: true },
  installation: { id: "installation", defaultUnitKind: "lump_sum", marketplaceReady: false },
  misc_electricals: { id: "misc_electricals", defaultUnitKind: "lump_sum", marketplaceReady: true },
  battery: { id: "battery", defaultUnitKind: "nos", marketplaceReady: true },
  monitoring: { id: "monitoring", defaultUnitKind: "nos", marketplaceReady: true }
};

/** Maps coarse pricing line kinds → EPC BOM category (subsidy/discount are non-BOM). */
export function defaultCatalogCategoryForLineKind(kind: PricingLineKind): EpcComponentCategory | null {
  switch (kind) {
    case "panels":
      return "solar_panels";
    case "inverter":
      return "inverters";
    case "structure":
      return "structure";
    case "acdb_dcdb":
      return "acdb";
    case "cabling":
      return "cables";
    case "earthing":
      return "earthing";
    case "installation":
      return "installation";
    case "transportation":
      return "misc_electricals";
    case "net_metering":
      return "net_meter";
    case "battery":
      return "battery";
    case "electricals":
    case "custom":
      return "misc_electricals";
    case "subsidy":
    case "discount":
      return null;
    default:
      return "misc_electricals";
  }
}
