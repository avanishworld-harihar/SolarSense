/**
 * Commercial BOM — DCR / Non-DCR solar module lines inside proposal_pricing.line_items.
 */

import { PANEL_CATALOG, type PanelType } from "@/lib/commercial-panel-catalog";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import {
  defaultLabelForKind,
  lineItemTotalInr,
  newPricingLineId,
  type PanelTrack,
  type PricingLineItem,
} from "@/lib/proposal-pricing-lines";
import { defaultCatalogCategoryForLineKind } from "@/lib/epc-component-catalog";

export const COMMERCIAL_PANEL_WATT_PRESETS = [540, 580, 625, 700] as const;

export function isTrackedCommercialPanelLine(L: PricingLineItem): boolean {
  return L.kind === "panels" && (L.panel_track === "dcr" || L.panel_track === "non_dcr");
}

export function moduleCountForPlant(systemKw: number, watt: number): number {
  const w = Math.max(100, Math.round(Number(watt) || 540));
  const kw = Math.max(0, Number(systemKw) || 0);
  if (kw <= 0) return 1;
  return Math.max(1, Math.ceil((kw * 1000) / w));
}

export function ratePerWpFromPanelLine(line: PricingLineItem): number {
  const watt = Math.max(100, Math.round(Number(line.watt) || 540));
  const qty = Math.max(1, Number(line.quantity) || 1);
  const total = lineItemTotalInr(line);
  const plantWp = qty * watt;
  if (plantWp <= 0) return 0;
  return Math.round((total / plantWp) * 100) / 100;
}

export function brandIdFromLineBrand(brand: string): string {
  const b = brand.trim();
  if (!b) return "waaree";
  const byLabel = PANEL_CATALOG.find((e) => e.brandLabel.toLowerCase() === b.toLowerCase());
  if (byLabel) return byLabel.brandId;
  const byId = PANEL_CATALOG.find((e) => e.brandId === b.toLowerCase());
  if (byId) return byId.brandId;
  return b.toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

function panelTypeForTrack(track: PanelTrack): PanelType {
  return track === "dcr" ? "DCR" : "NON_DCR";
}

export function findCatalogIdForTrack(brandId: string, watt: number, track: PanelTrack): string | null {
  const entry = PANEL_CATALOG.find(
    (e) => e.brandId === brandId && e.watt === watt && e.panelType === panelTypeForTrack(track)
  );
  return entry?.id ?? null;
}

export function createCommercialPanelLine(
  track: PanelTrack,
  systemKw: number,
  seed?: Partial<PricingLineItem>
): PricingLineItem {
  const watt = seed?.watt ?? 540;
  const moduleCount = moduleCountForPlant(systemKw, watt);
  const defaultRateWp = track === "dcr" ? 42 : 38;
  const brand = seed?.brand ?? "Waaree";
  return {
    id: seed?.id ?? newPricingLineId(),
    kind: "panels",
    label:
      seed?.label ??
      (track === "dcr" ? "Solar modules (DCR)" : "Solar modules (Non-DCR)"),
    brand,
    quantity: seed?.quantity ?? moduleCount,
    unit_rate_inr: seed?.unit_rate_inr ?? Math.round(watt * defaultRateWp),
    unit: seed?.unit ?? "nos",
    catalog_category: "solar_panels",
    panel_track: track,
    watt,
    technology: seed?.technology ?? (track === "dcr" ? "Mono PERC" : "PERC"),
    notes: seed?.notes,
  };
}

/** Ensures exactly one DCR and one Non-DCR panel line in the BOM. */
export function ensureCommercialPanelLines(lines: PricingLineItem[], systemKw: number): PricingLineItem[] {
  let next = [...lines];
  const tracks: PanelTrack[] = ["dcr", "non_dcr"];

  for (const track of tracks) {
    const existing = next.findIndex((l) => l.kind === "panels" && l.panel_track === track);
    if (existing >= 0) continue;

    const untrackedIdx = next.findIndex((l) => l.kind === "panels" && !l.panel_track);
    if (untrackedIdx >= 0 && track === "non_dcr") {
      const u = next[untrackedIdx];
      next[untrackedIdx] = {
        ...u,
        panel_track: "non_dcr",
        label: "Solar modules (Non-DCR)",
        watt: u.watt ?? 540,
        technology: u.technology ?? "PERC",
      };
      continue;
    }

    const firstPanelIdx = next.findIndex((l) => l.kind === "panels");
    const line = createCommercialPanelLine(track, systemKw);
    if (firstPanelIdx >= 0) {
      const insertAt = track === "dcr" ? firstPanelIdx : firstPanelIdx + 1;
      next.splice(insertAt, 0, line);
    } else {
      next.unshift(line);
    }
  }

  const hasBoth = tracks.every((t) => next.some((l) => l.kind === "panels" && l.panel_track === t));
  if (hasBoth) {
    next = next.filter((l) => !(l.kind === "panels" && !l.panel_track));
  }

  return next;
}

export function recalcCommercialPanelQuantities(lines: PricingLineItem[], systemKw: number): PricingLineItem[] {
  return lines.map((L) => {
    if (!isTrackedCommercialPanelLine(L)) return L;
    const watt = Math.max(100, Math.round(Number(L.watt) || 540));
    return { ...L, quantity: moduleCountForPlant(systemKw, watt) };
  });
}

export function defaultCommercialPanelLineItems(
  opts: {
    hardware_inr: number;
    installation_inr: number;
    structure_inr: number;
    subsidy_inr: number;
    discount_inr: number;
    system_kw: number;
    panelBrandHint?: string | null;
  }
): PricingLineItem[] {
  const brand = (opts.panelBrandHint ?? "").trim() || "Waaree";
  const dcr = createCommercialPanelLine("dcr", opts.system_kw, { brand });
  const nonDcr = createCommercialPanelLine("non_dcr", opts.system_kw, { brand });

  const seed = (
    kind: PricingLineItem["kind"],
    extra: Partial<Pick<PricingLineItem, "brand" | "unit_rate_inr" | "unit">>
  ): PricingLineItem => ({
    id: newPricingLineId(),
    kind,
    label: defaultLabelForKind(kind),
    brand: extra.brand ?? "",
    quantity: 1,
    unit_rate_inr: extra.unit_rate_inr ?? 0,
    unit: extra.unit ?? "nos",
    catalog_category: defaultCatalogCategoryForLineKind(kind),
  });

  const panelHardware = Math.max(0, Math.round(opts.hardware_inr));
  if (panelHardware > 0) {
    const half = Math.round(panelHardware / 2);
    dcr.unit_rate_inr = Math.round(half / Math.max(1, dcr.quantity));
    nonDcr.unit_rate_inr = Math.round((panelHardware - half) / Math.max(1, nonDcr.quantity));
  }

  return [
    dcr,
    nonDcr,
    seed("inverter", {}),
    seed("structure", { unit_rate_inr: Math.max(0, Math.round(opts.structure_inr)) }),
    seed("acdb_dcdb", {}),
    seed("cabling", {}),
    seed("earthing", {}),
    seed("installation", { unit_rate_inr: Math.max(0, Math.round(opts.installation_inr)) }),
    seed("transportation", {}),
    seed("net_metering", {}),
    seed("electricals", {}),
    seed("battery", {}),
    seed("subsidy", { unit_rate_inr: Math.max(0, Math.round(opts.subsidy_inr)) }),
    seed("discount", { unit_rate_inr: Math.max(0, Math.round(opts.discount_inr)) }),
  ];
}

/** Maps BOM panel lines → commercialConfig for web DCR comparison blocks. */
export function syncCommercialConfigFromPanelLines(
  config: CommercialProposalConfig,
  lines: PricingLineItem[],
  _systemKw: number
): CommercialProposalConfig {
  const dcrLine = lines.find((l) => l.kind === "panels" && l.panel_track === "dcr");
  const nonLine = lines.find((l) => l.kind === "panels" && l.panel_track === "non_dcr");
  if (!dcrLine && !nonLine) return config;

  const reg = { ...(config.panelRegistry ?? {}) };
  const overrides = { ...(reg.overrides ?? {}) };

  for (const [line, track] of [
    [dcrLine, "dcr"] as const,
    [nonLine, "non_dcr"] as const,
  ]) {
    if (!line) continue;
    const watt = Math.max(100, Math.round(Number(line.watt) || 540));
    const brandId = brandIdFromLineBrand(line.brand);
    const catalogId =
      findCatalogIdForTrack(brandId, watt, track) ??
      `${brandId}-${watt}-${track === "dcr" ? "dcr" : "non-dcr"}`;
    const rate = ratePerWpFromPanelLine(line);
    overrides[catalogId] = { ...overrides[catalogId], ratePerWpInr: rate };
    if (track === "dcr") reg.selectedDcrCatalogId = catalogId;
    else reg.selectedNonDcrCatalogId = catalogId;
  }

  const next: CommercialProposalConfig = {
    ...config,
    panelRegistry: { ...reg, overrides },
  };

  if (nonLine) {
    const watt = Math.max(100, Math.round(Number(nonLine.watt) || 540));
    const brandId = brandIdFromLineBrand(nonLine.brand);
    const catalogId = reg.selectedNonDcrCatalogId ?? "waaree-540-non-dcr";
    next.panel = {
      catalogId,
      brandId,
      watt,
      panelType: "NON_DCR",
      ratePerWpInr: ratePerWpFromPanelLine(nonLine),
      technology: nonLine.technology,
    };
  }

  if (dcrLine) {
    const watt = Math.max(100, Math.round(Number(dcrLine.watt) || 540));
    next.dcrComparison = {
      enabled: config.dcrComparison?.enabled ?? true,
      brandId: brandIdFromLineBrand(dcrLine.brand),
      watt,
    };
  }

  return next;
}
