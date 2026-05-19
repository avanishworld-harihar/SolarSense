/**
 * Commercial panel catalog — scalable rate tables (Law 1: single source of truth).
 *
 * NOT marketplace-linked. Local catalog for EPC rate cards.
 * Installers override `ratePerWpInr` per quote in commercialConfig.panel.ratePerWpInr.
 */

export type PanelType = "DCR" | "NON_DCR";

/** Common module technologies (India commercial rooftop, 2024–2026). */
export const PANEL_TECHNOLOGY_OPTIONS = [
  "Mono PERC",
  "Multi PERC",
  "Half-cut Mono PERC",
  "TOPCon (N-Type)",
  "HJT",
  "IBC",
  "Bifacial Mono PERC",
  "PERC",
] as const;

export type PanelTechnology = (typeof PANEL_TECHNOLOGY_OPTIONS)[number];

export type PanelCatalogEntry = {
  /** Stable id e.g. waaree-540-dcr */
  id: string;
  brandId: string;
  brandLabel: string;
  watt: number;
  panelType: PanelType;
  /** Default ₹/Wp — override per proposal in commercialConfig */
  ratePerWpInr: number;
  /** PM Surya Ghar / ALMM relevance for narrative */
  subsidyEligible: boolean;
  almmListed: boolean;
  technology: string;
};

/** Default commercial rate card — update centrally; never hardcode in UI */
export const PANEL_CATALOG: PanelCatalogEntry[] = [
  { id: "waaree-540-dcr", brandId: "waaree", brandLabel: "Waaree", watt: 540, panelType: "DCR", ratePerWpInr: 42, subsidyEligible: true, almmListed: true, technology: "PERC" },
  { id: "waaree-540-non-dcr", brandId: "waaree", brandLabel: "Waaree", watt: 540, panelType: "NON_DCR", ratePerWpInr: 38, subsidyEligible: false, almmListed: false, technology: "PERC" },
  { id: "waaree-575-non-dcr", brandId: "waaree", brandLabel: "Waaree", watt: 575, panelType: "NON_DCR", ratePerWpInr: 40, subsidyEligible: false, almmListed: false, technology: "TOPCon" },
  { id: "longi-575-non-dcr", brandId: "longi", brandLabel: "LONGi", watt: 575, panelType: "NON_DCR", ratePerWpInr: 41, subsidyEligible: false, almmListed: false, technology: "HiMO6" },
  { id: "adani-550-dcr", brandId: "adani", brandLabel: "Adani Solar", watt: 550, panelType: "DCR", ratePerWpInr: 43, subsidyEligible: true, almmListed: true, technology: "PERC" },
  { id: "adani-550-non-dcr", brandId: "adani", brandLabel: "Adani Solar", watt: 550, panelType: "NON_DCR", ratePerWpInr: 39, subsidyEligible: false, almmListed: false, technology: "PERC" },
  { id: "jinko-615-non-dcr", brandId: "jinko", brandLabel: "JinkoSolar", watt: 615, panelType: "NON_DCR", ratePerWpInr: 42, subsidyEligible: false, almmListed: false, technology: "Tiger Neo" },
  { id: "vikram-560-dcr", brandId: "vikram", brandLabel: "Vikram Solar", watt: 560, panelType: "DCR", ratePerWpInr: 44, subsidyEligible: true, almmListed: true, technology: "Mono PERC" },
];

export function getPanelCatalogEntry(id: string): PanelCatalogEntry | null {
  return PANEL_CATALOG.find((e) => e.id === id) ?? null;
}

export function listPanelsByBrand(brandId: string): PanelCatalogEntry[] {
  return PANEL_CATALOG.filter((e) => e.brandId === brandId);
}

export function listBrandIds(): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const e of PANEL_CATALOG) {
    if (!seen.has(e.brandId)) seen.set(e.brandId, e.brandLabel);
  }
  return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
}

export type PanelQuote = {
  catalogId: string;
  entry: PanelCatalogEntry;
  systemKw: number;
  moduleCount: number;
  hardwareInr: number;
  ratePerWpInr: number;
};

/**
 * Estimates panel hardware cost from catalog rate × system kW.
 * Module count = ceil(kW × 1000 / watt).
 */
export function resolvePanelQuote(
  systemKw: number,
  catalogId: string,
  rateOverridePerWp?: number | null
): PanelQuote | null {
  const entry = getPanelCatalogEntry(catalogId);
  if (!entry || systemKw <= 0) return null;

  const ratePerWpInr = rateOverridePerWp ?? entry.ratePerWpInr;
  const moduleCount = Math.max(1, Math.ceil((systemKw * 1000) / entry.watt));
  const actualKw = (moduleCount * entry.watt) / 1000;
  const hardwareInr = Math.round(actualKw * 1000 * ratePerWpInr);

  return {
    catalogId: entry.id,
    entry,
    systemKw: actualKw,
    moduleCount,
    hardwareInr,
    ratePerWpInr,
  };
}

export type DcrComparisonResult = {
  dcr: PanelQuote;
  nonDcr: PanelQuote;
  deltaInr: number;
  deltaPct: number;
  subsidyNote: string;
};

/**
 * Builds executive DCR vs NON-DCR comparison for same brand + watt when both exist.
 */
export function buildDcrComparison(
  systemKw: number,
  brandId: string,
  watt: number,
  dcrRateOverride?: number | null,
  nonDcrRateOverride?: number | null
): DcrComparisonResult | null {
  const dcrEntry = PANEL_CATALOG.find(
    (e) => e.brandId === brandId && e.watt === watt && e.panelType === "DCR"
  );
  const nonDcrEntry = PANEL_CATALOG.find(
    (e) => e.brandId === brandId && e.watt === watt && e.panelType === "NON_DCR"
  );
  if (!dcrEntry || !nonDcrEntry) return null;

  const dcr = resolvePanelQuote(systemKw, dcrEntry.id, dcrRateOverride);
  const nonDcr = resolvePanelQuote(systemKw, nonDcrEntry.id, nonDcrRateOverride);
  if (!dcr || !nonDcr) return null;

  const deltaInr = dcr.hardwareInr - nonDcr.hardwareInr;
  const deltaPct = nonDcr.hardwareInr > 0 ? Math.round((deltaInr / nonDcr.hardwareInr) * 100) : 0;

  return {
    dcr,
    nonDcr,
    deltaInr,
    deltaPct,
    subsidyNote: dcr.entry.subsidyEligible
      ? "DCR / ALMM-listed modules may qualify for higher central subsidy under applicable schemes."
      : "Verify ALMM list and DISCOM norms for subsidy eligibility.",
  };
}

export function formatPanelLabel(entry: PanelCatalogEntry): string {
  return `${entry.brandLabel} ${entry.watt}W ${entry.panelType === "DCR" ? "DCR" : "Non-DCR"}`;
}
