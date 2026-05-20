/**
 * Live panel qty + BOM sync for requirement-based residential proposals.
 */

import { moduleCountForPlant } from "@/lib/commercial-bom-panels";
import type { PanelTrack } from "@/lib/proposal-pricing-lines";
import {
  lineItemTotalInr,
  newPricingLineId,
  type PricingLineItem,
} from "@/lib/proposal-pricing-lines";
import {
  defaultResidentialConfig,
  type ResidentialProposalConfig,
  type ResidentialSolar,
} from "@/lib/residential-requirements-schema";

export type ResidentialPanelQuote = {
  solar: ResidentialSolar;
  track: PanelTrack;
  moduleCount: number;
  actualKw: number;
  hardwareInr: number;
};

export function trackToPanelType(track: ResidentialSolar["panelTrack"]): PanelTrack {
  return track === "dcr" ? "dcr" : "non_dcr";
}

export function moduleCountForResidential(solar: ResidentialSolar): number {
  if (solar.moduleCountOverride != null && solar.moduleCountOverride > 0) {
    return Math.round(solar.moduleCountOverride);
  }
  return moduleCountForPlant(solar.plantCapacityKw, solar.watt);
}

export function quoteResidentialSolar(solar: ResidentialSolar): ResidentialPanelQuote {
  const moduleCount = moduleCountForResidential(solar);
  const plantWp = moduleCount * solar.watt;
  const actualKw = Math.round((plantWp / 1000) * 100) / 100;
  const rate = Math.max(0, solar.ratePerWpInr);
  const hardwareInr = Math.round(plantWp * rate);
  return {
    solar,
    track: trackToPanelType(solar.panelTrack),
    moduleCount,
    actualKw,
    hardwareInr,
  };
}

export function panelLineFromResidentialQuote(q: ResidentialPanelQuote): PricingLineItem {
  const trackLabel = q.track === "dcr" ? "DCR" : "Non-DCR";
  return {
    id: newPricingLineId(),
    kind: "panels",
    label: `${q.solar.brand} ${q.solar.watt}W (${trackLabel})`,
    brand: q.solar.brand,
    quantity: q.moduleCount,
    unit_rate_inr: Math.round(q.solar.watt * q.solar.ratePerWpInr),
    unit: "nos",
    catalog_category: "solar_panels",
    panel_track: q.track,
    watt: q.solar.watt,
    technology: q.solar.technology,
  };
}

/** Replace tracked residential panel lines; preserve other BOM lines. */
export function syncResidentialSolarToLineItems(
  solar: ResidentialSolar,
  lines: PricingLineItem[]
): PricingLineItem[] {
  const rest = lines.filter((l) => !(l.kind === "panels" && l.panel_track));
  return [...rest, panelLineFromResidentialQuote(quoteResidentialSolar(solar))];
}

export function solarFromResidentialPanelLine(
  line: PricingLineItem,
  fallbackKw: number
): ResidentialSolar | null {
  if (line.kind !== "panels" || !line.panel_track) return null;
  const qty = Math.max(1, Number(line.quantity) || 1);
  const watt = Math.max(100, Math.round(Number(line.watt) || 540));
  const plantKw = (qty * watt) / 1000;
  const total = lineItemTotalInr(line);
  const ratePerWpInr = qty * watt > 0 ? Math.round((total / (qty * watt)) * 100) / 100 : 38;
  return {
    plantCapacityKw: plantKw > 0 ? Math.round(plantKw * 100) / 100 : fallbackKw,
    panelTrack: line.panel_track === "dcr" ? "dcr" : "non_dcr",
    brand: line.brand || "Solar Panel",
    watt,
    technology: line.technology,
    ratePerWpInr,
    moduleCountOverride: qty,
  };
}

export function ensureResidentialSolarInConfig(
  config: ResidentialProposalConfig,
  systemKw: number
): ResidentialProposalConfig {
  const kw = config.solar?.plantCapacityKw ?? systemKw;
  if (config.solar) return { ...config, solar: { ...config.solar, plantCapacityKw: kw } };
  return defaultResidentialConfig(kw);
}

export function syncResidentialLegacyDeckFields(
  config: ResidentialProposalConfig
): ResidentialProposalConfig {
  const q = quoteResidentialSolar(config.solar);
  return config;
}

/** Monthly EMI (reducing balance approximation) for residential storytelling. */
export function estimateResidentialEmiInr(
  principalInr: number,
  annualRatePct: number,
  tenureYears: number
): number {
  const p = Math.max(0, principalInr);
  if (p <= 0 || tenureYears <= 0) return 0;
  const r = Math.max(0, annualRatePct) / 100 / 12;
  const n = tenureYears * 12;
  if (r <= 0) return Math.round(p / n);
  const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}
