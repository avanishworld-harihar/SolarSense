/**
 * Requirement-based residential solar configuration (ppt_input.residentialConfig).
 * Simpler than commercial twin-track BOM — homeowner-friendly fields.
 */

import { z } from "zod";
import { PANEL_CATALOG } from "@/lib/commercial-panel-catalog";

export const residentialRoofTypeSchema = z.enum(["flat", "slope", "mixed", "unknown"]);
export const residentialBudgetRangeSchema = z.enum(["economy", "balanced", "premium"]);
export const residentialSubsidyPreferenceSchema = z.enum(["maximize", "standard", "none"]);
export const residentialPanelTrackSchema = z.enum(["dcr", "non_dcr"]);

export const residentialSolarSchema = z.object({
  plantCapacityKw: z.number().min(0.5).max(50),
  panelTrack: residentialPanelTrackSchema.default("dcr"),
  brand: z.string().max(80),
  brandId: z.string().max(40).optional(),
  watt: z.number().min(100).max(900),
  technology: z.string().max(80).optional(),
  ratePerWpInr: z.number().min(0).max(500),
  /** When set, overrides auto module count from plant kW ÷ watt. */
  moduleCountOverride: z.number().min(0).max(500).optional(),
});

export const residentialFinancingSchema = z.object({
  enabled: z.boolean().default(true),
  interestRatePct: z.number().min(0).max(30).default(10.5),
  selectedTenureYears: z.number().int().min(1).max(20).default(5),
  tenuresYears: z.array(z.number().int().min(1).max(20)).max(6).optional(),
  downPaymentInr: z.number().min(0).optional(),
});

export const residentialBatterySchema = z.object({
  required: z.boolean().default(false),
  capacityKwh: z.number().min(0).max(100).optional(),
});

export const residentialSubsidySchema = z.object({
  preference: residentialSubsidyPreferenceSchema.default("maximize"),
  /** Installer override; when omitted, deck uses PM Surya Ghar estimate from system kW. */
  estimateInr: z.number().min(0).optional(),
});

export const residentialProposalConfigSchema = z.object({
  solar: residentialSolarSchema,
  roofType: residentialRoofTypeSchema.default("unknown"),
  budgetRange: residentialBudgetRangeSchema.default("balanced"),
  battery: residentialBatterySchema.optional(),
  subsidy: residentialSubsidySchema.optional(),
  financing: residentialFinancingSchema.optional(),
  notes: z.string().max(600).optional(),
  /** Builder path marker */
  inputMode: z.literal("requirement").optional(),
});

export type ResidentialSolar = z.infer<typeof residentialSolarSchema>;
export type ResidentialProposalConfig = z.infer<typeof residentialProposalConfigSchema>;
export type ResidentialPanelTrack = z.infer<typeof residentialPanelTrackSchema>;

function defaultRate(brandId: string, watt: number, track: "DCR" | "NON_DCR"): number {
  const hit = PANEL_CATALOG.find(
    (e) => e.brandId === brandId && e.watt === watt && e.panelType === track
  );
  if (hit) return hit.ratePerWpInr;
  return track === "DCR" ? 42 : 38;
}

export function defaultResidentialConfig(plantKw = 5): ResidentialProposalConfig {
  const kw = Math.max(1, Math.min(50, plantKw));
  return {
    inputMode: "requirement",
    solar: {
      plantCapacityKw: kw,
      panelTrack: "dcr",
      brand: "Adani Solar",
      brandId: "adani",
      watt: 550,
      technology: "Mono PERC",
      ratePerWpInr: defaultRate("adani", 550, "DCR"),
    },
    roofType: "flat",
    budgetRange: "balanced",
    battery: { required: false },
    subsidy: { preference: "maximize" },
    financing: {
      enabled: true,
      interestRatePct: 10.5,
      selectedTenureYears: 5,
      tenuresYears: [3, 5, 7, 10],
    },
  };
}

export const RESIDENTIAL_BRAND_PRESETS = [
  { brandId: "adani", brand: "Adani Solar", watt: 550 },
  { brandId: "waaree", brand: "Waaree", watt: 540 },
  { brandId: "vikram", brand: "Vikram Solar", watt: 560 },
  { brandId: "longi", brand: "LONGi", watt: 575 },
] as const;

export const RESIDENTIAL_WATT_PRESETS = [540, 550, 575, 625] as const;
