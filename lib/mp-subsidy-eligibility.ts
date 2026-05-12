/**
 * MP domestic (Atal Griha Jyoti / related) subsidy applies ONLY to approved
 * residential categories. Commercial, industrial, and other LT categories
 * must receive zero from the domestic subsidy calculator — regardless of OCR.
 */

import type { MpTariffCategory } from "@/lib/mp-tariff-2025-26";

export function isEligibleForMpDomesticSubsidy(category: MpTariffCategory): boolean {
  return category === "LV1.2";
}
