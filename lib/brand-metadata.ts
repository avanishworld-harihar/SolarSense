/**
 * SOL.52 Brand Metadata — Wave 3 P7.
 *
 * Local-only reference data for solar panel and inverter brands.
 *
 * Law 8 (Marketplace Deferred):
 *   This file is intentionally LOCAL-ONLY. It contains curated reference data
 *   for the brand_comparison_card block. It is NOT connected to any marketplace,
 *   procurement platform, or live pricing API.
 *
 *   Forbidden: seller_* | marketplace_* | commission_* | live_price_*
 *   These fields will never appear in this file.
 *
 * Data accuracy: specs are typical/indicative — not guaranteed.
 * Installers can override displayed brands via BOM overrides.
 * This data drives the comparison UI only, not pricing calculations.
 *
 * Update cadence: manually updated per major product cycle (not real-time).
 */

// ─── Panel brands ─────────────────────────────────────────────────────────

export type PanelTier = "tier1" | "tier2" | "tier3";

export type PanelBrandSpec = {
  id: string;
  name: string;
  origin: string;
  tier: PanelTier;
  /** Typical available wattage range (Wp) */
  wattageRange: [number, number];
  /** Typical module efficiency % */
  efficiency: number;
  /** Product warranty years */
  productWarrantyYears: number;
  /** Performance warranty years */
  performanceWarrantyYears: number;
  /** Key technology (PERC, TOPCon, HJT, etc.) */
  technology: string;
  /** Short headline badge — shown in comparison card */
  badge: string;
  /** One-line description */
  description: string;
  /** Hindi description */
  descriptionHi: string;
};

export const PANEL_BRANDS: PanelBrandSpec[] = [
  {
    id: "waaree",
    name: "Waaree Energies",
    origin: "India",
    tier: "tier1",
    wattageRange: [400, 590],
    efficiency: 21.3,
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    technology: "PERC / TOPCon",
    badge: "India #1",
    description: "India's largest solar manufacturer. Strong after-sales network.",
    descriptionHi: "भारत का सबसे बड़ा सोलर पैनल निर्माता। मजबूत सर्विस नेटवर्क।",
  },
  {
    id: "adani",
    name: "Adani Solar",
    origin: "India",
    tier: "tier1",
    wattageRange: [390, 580],
    efficiency: 21.0,
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    technology: "PERC / M10 cells",
    badge: "Made in India",
    description: "Vertically integrated Indian manufacturer with end-to-end quality.",
    descriptionHi: "भारतीय एकीकृत निर्माता — शुरू से अंत तक गुणवत्ता।",
  },
  {
    id: "longi",
    name: "LONGi Solar",
    origin: "China",
    tier: "tier1",
    wattageRange: [415, 620],
    efficiency: 22.4,
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    technology: "HIMO6 TOPCon",
    badge: "Global #1",
    description: "World's largest mono-crystalline solar panel manufacturer.",
    descriptionHi: "दुनिया के सबसे बड़े मोनो-क्रिस्टलाइन पैनल निर्माता।",
  },
  {
    id: "jinko",
    name: "JinkoSolar",
    origin: "China",
    tier: "tier1",
    wattageRange: [400, 615],
    efficiency: 21.8,
    productWarrantyYears: 12,
    performanceWarrantyYears: 30,
    technology: "Tiger Neo TOPCon",
    badge: "Tiger Neo",
    description: "Consistent quality with one of the largest global install bases.",
    descriptionHi: "दुनियाभर में सबसे ज़्यादा इंस्टॉल — भरोसेमंद गुणवत्ता।",
  },
  {
    id: "vikram",
    name: "Vikram Solar",
    origin: "India",
    tier: "tier1",
    wattageRange: [390, 560],
    efficiency: 20.9,
    productWarrantyYears: 12,
    performanceWarrantyYears: 27,
    technology: "PERC / Mono",
    badge: "Tier 1 India",
    description: "Premium Indian Tier-1 module with strong domestic support.",
    descriptionHi: "प्रीमियम भारतीय टियर-1 पैनल — देशव्यापी सर्विस।",
  },
];

// ─── Inverter brands ──────────────────────────────────────────────────────

export type InverterType = "string" | "microinverter" | "hybrid" | "central";

export type InverterBrandSpec = {
  id: string;
  name: string;
  origin: string;
  inverterType: InverterType;
  /** Typical power range in kW */
  powerRangeKw: [number, number];
  /** Grid standards supported */
  gridStandards: string[];
  /** Efficiency % */
  efficiency: number;
  /** Warranty years */
  warrantyYears: number;
  /** Display badge */
  badge: string;
  description: string;
  descriptionHi: string;
};

export const INVERTER_BRANDS: InverterBrandSpec[] = [
  {
    id: "sungrow",
    name: "Sungrow",
    origin: "China",
    inverterType: "string",
    powerRangeKw: [2, 350],
    gridStandards: ["CEA", "IEC", "UL"],
    efficiency: 98.6,
    warrantyYears: 5,
    badge: "Global #2",
    description: "World's #2 inverter brand. Excellent India support and BIS certification.",
    descriptionHi: "दुनिया का दूसरा सबसे बड़ा इन्वर्टर ब्रांड। भारत में BIS सर्टिफाइड।",
  },
  {
    id: "growatt",
    name: "Growatt",
    origin: "China",
    inverterType: "string",
    powerRangeKw: [1, 250],
    gridStandards: ["CEA", "IEC"],
    efficiency: 98.4,
    warrantyYears: 5,
    badge: "Value Leader",
    description: "Cost-effective with good app monitoring. Popular for C&I rooftops.",
    descriptionHi: "किफ़ायती, अच्छी ऐप मॉनिटरिंग। C&I रूफटॉप में लोकप्रिय।",
  },
  {
    id: "solaredge",
    name: "SolarEdge",
    origin: "Israel",
    inverterType: "string",
    powerRangeKw: [3, 100],
    gridStandards: ["CEA", "IEC", "UL"],
    efficiency: 99.2,
    warrantyYears: 12,
    badge: "Premium DC Opt",
    description: "Industry-leading efficiency with power optimisers for shade mitigation.",
    descriptionHi: "पावर ऑप्टिमाइज़र के साथ इंडस्ट्री-लीडिंग एफिशिएंसी।",
  },
  {
    id: "delta",
    name: "Delta Electronics",
    origin: "Taiwan",
    inverterType: "string",
    powerRangeKw: [3, 110],
    gridStandards: ["CEA", "IEC"],
    efficiency: 98.8,
    warrantyYears: 5,
    badge: "Reliable",
    description: "Proven reliability in industrial applications. Long service history in India.",
    descriptionHi: "औद्योगिक अनुप्रयोगों में सिद्ध विश्वसनीयता। भारत में लंबा इतिहास।",
  },
  {
    id: "huawei",
    name: "Huawei FusionSolar",
    origin: "China",
    inverterType: "string",
    powerRangeKw: [3, 350],
    gridStandards: ["CEA", "IEC"],
    efficiency: 99.0,
    warrantyYears: 5,
    badge: "Smart AI",
    description: "AI-powered smart string inverter with advanced grid management.",
    descriptionHi: "AI-पावर्ड स्मार्ट इन्वर्टर — एडवांस्ड ग्रिड मैनेजमेंट।",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getPanelBrand(id: string): PanelBrandSpec | null {
  return PANEL_BRANDS.find((b) => b.id === id) ?? null;
}

export function getInverterBrand(id: string): InverterBrandSpec | null {
  return INVERTER_BRANDS.find((b) => b.id === id) ?? null;
}

/**
 * Returns top N panel brands by tier and efficiency.
 * Used to pre-populate the comparison card when no BOM override is set.
 */
export function getTopPanelBrands(n = 3): PanelBrandSpec[] {
  return [...PANEL_BRANDS]
    .filter((b) => b.tier === "tier1")
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, n);
}

/**
 * Returns top N inverter brands for string inverters by efficiency.
 */
export function getTopInverterBrands(n = 3): InverterBrandSpec[] {
  return [...INVERTER_BRANDS]
    .filter((b) => b.inverterType === "string")
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, n);
}
