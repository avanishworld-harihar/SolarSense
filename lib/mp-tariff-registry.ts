import {
  MP_DOMESTIC_SUBSIDY_FY_2025_26,
  MP_ELECTRICITY_DUTY_FY_2025_26,
  MP_TARIFF_FY_2025_26,
  type CategoryTariff,
  type ElectricityDutyRule,
  type MpDomesticSubsidySchedule,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";
import {
  MP_DOMESTIC_SUBSIDY_FY_2026_27,
  MP_ELECTRICITY_DUTY_FY_2026_27,
  MP_TARIFF_FY_2026_27,
  isFY2026_27OrLater
} from "@/lib/mp-tariff-2026-27";

export type MpFinancialYearKey = "2025-26" | "2026-27";

export type MpTariffVersion = {
  fy: MpFinancialYearKey;
  effectiveFromMonth: string;
  tariffs: Record<MpTariffCategory, CategoryTariff>;
  electricityDuty: Record<MpTariffCategory, ElectricityDutyRule>;
  domesticSubsidy: MpDomesticSubsidySchedule;
};

export const MP_TARIFF_VERSIONS: Record<MpFinancialYearKey, MpTariffVersion> = {
  "2025-26": {
    fy: "2025-26",
    effectiveFromMonth: "2025-04",
    tariffs: MP_TARIFF_FY_2025_26,
    electricityDuty: MP_ELECTRICITY_DUTY_FY_2025_26,
    domesticSubsidy: MP_DOMESTIC_SUBSIDY_FY_2025_26
  },
  "2026-27": {
    fy: "2026-27",
    effectiveFromMonth: "2026-04",
    tariffs: MP_TARIFF_FY_2026_27,
    electricityDuty: MP_ELECTRICITY_DUTY_FY_2026_27,
    domesticSubsidy: MP_DOMESTIC_SUBSIDY_FY_2026_27
  }
};

export function resolveMpTariffVersion(billMonth?: string | null): MpTariffVersion {
  return isFY2026_27OrLater(billMonth) ? MP_TARIFF_VERSIONS["2026-27"] : MP_TARIFF_VERSIONS["2025-26"];
}

export function getMpCategoryTariff(category: MpTariffCategory, billMonth?: string | null): CategoryTariff {
  return resolveMpTariffVersion(billMonth).tariffs[category];
}

export function getMpElectricityDutyRule(category: MpTariffCategory, billMonth?: string | null): ElectricityDutyRule {
  return resolveMpTariffVersion(billMonth).electricityDuty[category];
}

export function getMpDomesticSubsidySchedule(billMonth?: string | null): MpDomesticSubsidySchedule {
  return resolveMpTariffVersion(billMonth).domesticSubsidy;
}
