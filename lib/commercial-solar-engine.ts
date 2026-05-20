/**
 * Live calculations + BOM sync for requirement-based commercial solar panels.
 */

import { brandIdFromLineBrand, moduleCountForPlant } from "@/lib/commercial-bom-panels";
import type { PanelTrack } from "@/lib/proposal-pricing-lines";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import {
  defaultSolarPanels,
  type CommercialSolarPanels,
  type PanelBrandRow,
  type PanelTrackGroup,
} from "@/lib/commercial-solar-schema";
import {
  lineItemTotalInr,
  newPricingLineId,
  type PricingLineItem,
} from "@/lib/proposal-pricing-lines";

export type PanelRowQuote = {
  row: PanelBrandRow;
  track: PanelTrack;
  moduleCount: number;
  plantKw: number;
  hardwareInr: number;
  ratePerWpInr: number;
};

export function moduleCountForRow(plantKw: number, row: PanelBrandRow): number {
  if (row.quantityOverride != null && row.quantityOverride > 0) {
    return Math.round(row.quantityOverride);
  }
  return moduleCountForPlant(plantKw, row.watt);
}

export function quotePanelRow(plantKw: number, row: PanelBrandRow, track: PanelTrack): PanelRowQuote {
  const moduleCount = moduleCountForRow(plantKw, row);
  const plantWp = moduleCount * row.watt;
  const actualKw = plantWp / 1000;
  const rate = Math.max(0, row.ratePerWpInr);
  const hardwareInr = Math.round(plantWp * rate);
  return {
    row,
    track,
    moduleCount,
    plantKw: Math.round(actualKw * 100) / 100,
    hardwareInr,
    ratePerWpInr: rate,
  };
}

export function primaryRowInTrack(group: PanelTrackGroup): PanelBrandRow | null {
  if (!group.rows.length) return null;
  return group.rows.find((r) => r.isPrimary) ?? group.rows[0];
}

export function allPanelQuotes(solar: CommercialSolarPanels): PanelRowQuote[] {
  const kw = solar.plantCapacityKw;
  const out: PanelRowQuote[] = [];
  if (solar.dcr.enabled) {
    for (const row of solar.dcr.rows) {
      out.push(quotePanelRow(kw, row, "dcr"));
    }
  }
  if (solar.nonDcr.enabled) {
    for (const row of solar.nonDcr.rows) {
      out.push(quotePanelRow(kw, row, "non_dcr"));
    }
  }
  return out;
}

export function panelLineFromQuote(q: PanelRowQuote): PricingLineItem {
  const trackLabel = q.track === "dcr" ? "DCR" : "Non-DCR";
  return {
    id: newPricingLineId(),
    kind: "panels",
    label: `${q.row.brand} ${q.row.watt}W (${trackLabel})`,
    brand: q.row.brand,
    quantity: q.moduleCount,
    unit_rate_inr: Math.round(q.row.watt * q.ratePerWpInr),
    unit: "nos",
    catalog_category: "solar_panels",
    panel_track: q.track,
    watt: q.row.watt,
    technology: q.row.technology,
    notes: q.row.notes,
  };
}

/** Replace tracked panel lines; preserve all other BOM lines. */
export function syncSolarPanelsToLineItems(
  solar: CommercialSolarPanels,
  lines: PricingLineItem[]
): PricingLineItem[] {
  const rest = lines.filter((l) => !(l.kind === "panels" && l.panel_track));
  const panelLines: PricingLineItem[] = [];
  if (solar.dcr.enabled) {
    for (const row of solar.dcr.rows) {
      panelLines.push(panelLineFromQuote(quotePanelRow(solar.plantCapacityKw, row, "dcr")));
    }
  }
  if (solar.nonDcr.enabled) {
    for (const row of solar.nonDcr.rows) {
      panelLines.push(panelLineFromQuote(quotePanelRow(solar.plantCapacityKw, row, "non_dcr")));
    }
  }
  return [...panelLines, ...rest];
}

export function ensureSolarPanelsInConfig(
  config: CommercialProposalConfig,
  systemKw: number
): CommercialProposalConfig {
  if (config.solarPanels?.dcr?.rows?.length && config.solarPanels?.nonDcr?.rows?.length) {
    return {
      ...config,
      solarPanels: {
        ...config.solarPanels,
        plantCapacityKw: config.solarPanels.plantCapacityKw || systemKw,
      },
    };
  }
  return { ...config, solarPanels: defaultSolarPanels(systemKw) };
}

/** Push primary DCR/Non-DCR selections into legacy panelRegistry for deck blocks. */
export function syncLegacyPanelFieldsFromSolar(
  config: CommercialProposalConfig
): CommercialProposalConfig {
  const solar = config.solarPanels;
  if (!solar) return config;

  const dcrPrimary = primaryRowInTrack(solar.dcr);
  const nonPrimary = primaryRowInTrack(solar.nonDcr);
  const overrides = { ...(config.panelRegistry?.overrides ?? {}) };

  const reg = { ...(config.panelRegistry ?? {}) };

  if (dcrPrimary) {
    const q = quotePanelRow(solar.plantCapacityKw, dcrPrimary, "dcr");
    const catalogId = `${brandIdFromLineBrand(dcrPrimary.brand)}-${dcrPrimary.watt}-dcr`;
    reg.selectedDcrCatalogId = catalogId;
    overrides[catalogId] = { ...overrides[catalogId], ratePerWpInr: q.ratePerWpInr };
  }
  if (nonPrimary) {
    const q = quotePanelRow(solar.plantCapacityKw, nonPrimary, "non_dcr");
    const catalogId = `${brandIdFromLineBrand(nonPrimary.brand)}-${nonPrimary.watt}-non-dcr`;
    reg.selectedNonDcrCatalogId = catalogId;
    overrides[catalogId] = { ...overrides[catalogId], ratePerWpInr: q.ratePerWpInr };
  }

  return {
    ...config,
    panelRegistry: { ...reg, overrides },
    panel: nonPrimary
      ? {
          catalogId: reg.selectedNonDcrCatalogId ?? "waaree-540-non-dcr",
          brandId: brandIdFromLineBrand(nonPrimary.brand),
          watt: nonPrimary.watt,
          panelType: "NON_DCR",
          ratePerWpInr: quotePanelRow(solar.plantCapacityKw, nonPrimary, "non_dcr").ratePerWpInr,
          technology: nonPrimary.technology,
        }
      : config.panel,
    dcrComparison: {
      enabled: config.dcrComparison?.enabled !== false,
      brandId: dcrPrimary ? brandIdFromLineBrand(dcrPrimary.brand) : config.dcrComparison?.brandId,
      watt: dcrPrimary?.watt ?? config.dcrComparison?.watt ?? 540,
    },
  };
}

export type DcrCompareFromSolar = {
  dcr: PanelRowQuote;
  nonDcr: PanelRowQuote;
  deltaInr: number;
  deltaPct: number;
};

export function buildDcrCompareFromSolar(solar: CommercialSolarPanels): DcrCompareFromSolar | null {
  const dcr = primaryRowInTrack(solar.dcr);
  const non = primaryRowInTrack(solar.nonDcr);
  if (!dcr || !non || !solar.dcr.enabled || !solar.nonDcr.enabled) return null;
  const dcrQ = quotePanelRow(solar.plantCapacityKw, dcr, "dcr");
  const nonQ = quotePanelRow(solar.plantCapacityKw, non, "non_dcr");
  const deltaInr = dcrQ.hardwareInr - nonQ.hardwareInr;
  const deltaPct = nonQ.hardwareInr > 0 ? Math.round((deltaInr / nonQ.hardwareInr) * 100) : 0;
  return { dcr: dcrQ, nonDcr: nonQ, deltaInr, deltaPct };
}

/** Migrate two-line BOM into solarPanels when opening old deals. */
export function solarPanelsFromLineItems(
  lines: PricingLineItem[],
  systemKw: number
): CommercialSolarPanels | null {
  const dcrLines = lines.filter((l) => l.kind === "panels" && l.panel_track === "dcr");
  const nonLines = lines.filter((l) => l.kind === "panels" && l.panel_track === "non_dcr");
  if (dcrLines.length === 0 && nonLines.length === 0) return null;

  const toRow = (l: PricingLineItem, track: PanelTrack, primary: boolean): PanelBrandRow => ({
    id: l.id,
    brand: l.brand || "Waaree",
    brandId: brandIdFromLineBrand(l.brand),
    watt: l.watt ?? 540,
    technology: l.technology,
    ratePerWpInr: lineItemTotalInr(l) / Math.max(1, (l.quantity || 1) * (l.watt ?? 540)),
    quantityOverride: l.quantity,
    notes: l.notes,
    isPrimary: primary,
  });

  const base = defaultSolarPanels(systemKw);
  if (dcrLines.length) {
    base.dcr.rows = dcrLines.map((l, i) => toRow(l, "dcr", i === 0));
  }
  if (nonLines.length) {
    base.nonDcr.rows = nonLines.map((l, i) => toRow(l, "non_dcr", i === 0));
  }
  base.plantCapacityKw = systemKw;
  return base;
}
