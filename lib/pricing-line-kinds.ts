export const PRICING_LINE_KINDS = [
  "panels",
  "inverter",
  "structure",
  "installation",
  "battery",
  "electricals",
  "subsidy",
  "discount",
  "custom"
] as const;

export type PricingLineKind = (typeof PRICING_LINE_KINDS)[number];
