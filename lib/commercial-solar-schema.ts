/**
 * Requirement-based commercial solar panel configuration (stored in commercialConfig.solarPanels).
 */

import { z } from "zod";
import { PANEL_CATALOG } from "@/lib/commercial-panel-catalog";

export const panelBrandRowSchema = z.object({
  id: z.string().min(1).max(48),
  brand: z.string().max(80),
  brandId: z.string().max(40).optional(),
  watt: z.number().min(100).max(900),
  technology: z.string().max(80).optional(),
  ratePerWpInr: z.number().min(0).max(500),
  /** When set, overrides auto module count from plant kW ÷ watt. */
  quantityOverride: z.number().min(0).max(50_000).optional(),
  notes: z.string().max(300).optional(),
  /** Primary row for DCR vs Non-DCR comparison & default BOM line. */
  isPrimary: z.boolean().optional(),
});

export const panelTrackGroupSchema = z.object({
  enabled: z.boolean().default(true),
  collapsed: z.boolean().optional(),
  rows: z.array(panelBrandRowSchema).max(16),
});

export const commercialSolarPanelsSchema = z.object({
  plantCapacityKw: z.number().min(0.1).max(10_000),
  dcr: panelTrackGroupSchema,
  nonDcr: panelTrackGroupSchema,
});

export const brandComparisonConfigSchema = z.object({
  enabled: z.boolean().default(true),
  /** brandId slugs for deck brand_comparison_card priority */
  priorityBrandIds: z.array(z.string().max(40)).max(8).optional(),
  tier: z.enum(["premium", "balanced", "budget"]).optional(),
});

export const executionMilestoneSchema = z.object({
  id: z.string().min(1).max(48),
  label: z.string().max(120),
  durationWeeks: z.number().min(0).max(104).optional(),
  enabled: z.boolean().default(true),
});

export const executionTimelineConfigSchema = z.object({
  enabled: z.boolean().default(true),
  milestones: z.array(executionMilestoneSchema).max(16),
});

export type PanelBrandRow = z.infer<typeof panelBrandRowSchema>;
export type PanelTrackGroup = z.infer<typeof panelTrackGroupSchema>;
export type CommercialSolarPanels = z.infer<typeof commercialSolarPanelsSchema>;
export type BrandComparisonConfig = z.infer<typeof brandComparisonConfigSchema>;
export type ExecutionTimelineConfig = z.infer<typeof executionTimelineConfigSchema>;

export function newPanelBrandRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 12);
  }
  return `pbr-${Date.now().toString(36)}`;
}

function defaultRateFor(brandId: string, watt: number, track: "DCR" | "NON_DCR"): number {
  const hit = PANEL_CATALOG.find(
    (e) => e.brandId === brandId && e.watt === watt && e.panelType === track
  );
  if (hit) return hit.ratePerWpInr;
  return track === "DCR" ? 42 : 38;
}

function seedRow(
  brand: string,
  brandId: string,
  watt: number,
  technology: string,
  track: "DCR" | "NON_DCR",
  isPrimary?: boolean
): PanelBrandRow {
  return {
    id: newPanelBrandRowId(),
    brand,
    brandId,
    watt,
    technology,
    ratePerWpInr: defaultRateFor(brandId, watt, track),
    isPrimary,
  };
}

export function defaultSolarPanels(plantCapacityKw: number): CommercialSolarPanels {
  const kw = Math.max(1, plantCapacityKw);
  return {
    plantCapacityKw: kw,
    dcr: {
      enabled: true,
      collapsed: false,
      rows: [
        seedRow("Adani Solar", "adani", 700, "TOPCon (N-Type)", "DCR", true),
        seedRow("Waaree", "waaree", 540, "Mono PERC", "DCR"),
        seedRow("Vikram Solar", "vikram", 560, "Mono PERC", "DCR"),
      ],
    },
    nonDcr: {
      enabled: true,
      collapsed: false,
      rows: [
        seedRow("LONGi", "longi", 575, "HiMO6", "NON_DCR", true),
        seedRow("JinkoSolar", "jinko", 615, "Tiger Neo", "NON_DCR"),
        seedRow("Waaree", "waaree", 625, "TOPCon (N-Type)", "NON_DCR"),
      ],
    },
  };
}

export const DEFAULT_EXECUTION_MILESTONES: ExecutionTimelineConfig["milestones"] = [
  { id: "survey", label: "Site survey & design sign-off", durationWeeks: 2, enabled: true },
  { id: "statutory", label: "Statutory approvals & net-meter application", durationWeeks: 4, enabled: true },
  { id: "procurement", label: "Material procurement", durationWeeks: 3, enabled: true },
  { id: "install", label: "Installation & commissioning", durationWeeks: 6, enabled: true },
  { id: "handover", label: "Handover & O&M briefing", durationWeeks: 1, enabled: true },
];

export function defaultExecutionTimeline(): ExecutionTimelineConfig {
  return { enabled: true, milestones: DEFAULT_EXECUTION_MILESTONES.map((m) => ({ ...m })) };
}
