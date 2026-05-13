/** Commercial BOM line types — rollup buckets unchanged (see proposal-pricing-lines). */
export const PRICING_LINE_KINDS = [
  "panels",
  "inverter",
  "structure",
  "acdb_dcdb",
  "cabling",
  "earthing",
  "installation",
  "transportation",
  "net_metering",
  "electricals",
  "battery",
  "subsidy",
  "discount",
  "custom"
] as const;

export type PricingLineKind = (typeof PRICING_LINE_KINDS)[number];
