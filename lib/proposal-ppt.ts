import PptxGenJS from "pptxgenjs";
import QRCode from "qrcode";
import type { MonthlyUnits } from "@/lib/types";
import { applyTariffCategoryOverride, estimateMonthlyBillBreakdownWithContext, getFallbackTariffContext } from "@/lib/tariff-engine";
import { buildMpAuditRows, isMpProposalContext, type MpMonthlyAuditOverride } from "@/lib/mp-ppt-bill-rows";
import {
  buildAmcOptions,
  buildBom,
  buildEmiTable,
  buildPaymentMilestones,
  buildUpiDeepLink,
  computeEnvironmentalImpact,
  computePmSuryaGharSubsidy,
  computeSolarVsGrid,
  defaultCompanyProfile,
  estimateAnnualGenerationUnits,
  honestPaybackYears,
  pickBrandSet,
  profileFieldOrDash,
  withHonorific,
  type AmcOption,
  type CompanyProfile,
  type CustomerProfile,
  type DeckBrand,
  type DeckBomItem,
  type EmiRow,
  type PaymentMilestone
} from "@/lib/proposal-deck-helpers";
import { dict, monthLabels, type ProposalDict, type ProposalLang } from "@/lib/proposal-i18n";

// =============================================================================
// PUBLIC TYPES
// =============================================================================

export type ProposalBankDetails = {
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  upiId?: string;
  /** Uploaded payment QR code image URL (Supabase Storage or data-URI). Shown in the Banking slide. */
  paymentQrCodeUrl?: string;
};

export type ProposalFinanceOption = {
  /** Annual interest rate %. Default 7. */
  interestRatePct?: number;
  /** Tenure list (years). Default [3, 5, 7]. */
  tenuresYears?: number[];
  /** When the customer has chosen one tenure, mark it for highlight. */
  selectedTenureYears?: number;
};

export type PremiumProposalPptInput = {
  customerName: string;
  location: string;
  systemKw: number;
  yearlyBill: number;
  afterSolar: number;
  saving: number;
  paybackYears: number;
  monthlyUnits: MonthlyUnits;
  state?: string;
  discom?: string;
  connectionType?: string;
  /** Bill "Purpose" line — e.g. Shops/Showrooms (Smart Multi-Factor billing). */
  purposeOfSupply?: string;
  tariffCategory?: string;
  connectedLoadKw?: number;
  contractDemandKva?: number;
  areaProfile?: "urban" | "rural";
  billMonth?: string;
  currentMonthBillAmountInr?: number | null;
  monthlyBillActuals?: Partial<Record<keyof MonthlyUnits, number>>;
  monthlyAuditOverrides?: Partial<Record<keyof MonthlyUnits, MpMonthlyAuditOverride>>;
  monthlyFppasPct?: Partial<Record<keyof MonthlyUnits, number>>;
  agjyClaimed?: boolean;
  /** Board snapshot — Energy Charges line (₹) for Smart Billing cross-check. */
  billEnergyChargesInr?: number;
  /** Electricity Duty line (₹) — optional cross-check. */
  billElectricityDutyInr?: number;
  /** Metered units on the reference bill row (for implied ₹/kWh). */
  referenceBillUnits?: number;
  /** Fixed charge (₹) on reference bill — Smart Multi-Factor validation. */
  billFixedChargeInr?: number;

  grossSystemCostInr?: number;
  pmSuryaGharSubsidyInr?: number;
  netCostInr?: number;
  panelBrand?: DeckBrand;
  installerName?: string;
  installerTagline?: string;
  installerContact?: string;
  /** Optional company logo (data URL or http(s) URL). */
  installerLogoUrl?: string;

  /** Multilingual selection. Defaults to English. */
  lang?: ProposalLang;

  /** Customer profile for the cover slide. */
  customerProfile?: CustomerProfile;

  /** Finance / EMI configuration. */
  financeOption?: ProposalFinanceOption;

  /** AMC selection (1 / 5 / 10 yr). Defaults to 5. */
  amcSelectedYears?: 1 | 5 | 10;

  /** Override Harihar Solar default company profile. */
  companyProfile?: Partial<CompanyProfile>;

  /** Bank + UPI details for the banking slide. */
  bankDetails?: ProposalBankDetails;

  /** Up to 6 image URLs / data-URIs for past-installation photos. */
  siteImages?: string[];

  /** Per-project BOM overrides (final-product picks). */
  bomOverrides?: Array<{
    slot: number;
    title?: string;
    spec?: string;
    brand?: string;
    warranty?: string;
  }>;

  /** Public web proposal URL — embedded as QR fallback on slide 11 when
   *  no site photos are uploaded ("Scan to view this proposal"). */
  webProposalUrl?: string;
};

export type ProposalDeckSummary = {
  honoredName: string;
  installer: string;
  tagline: string;
  contact: string;
  systemKw: number;
  panelBrand: string;
  panels: number;
  yearlyBill: number;
  afterSolar: number;
  annualSaving: number;
  totalReduction: number;
  grossSystemCost: number;
  pmSubsidy: number;
  netCost: number;
  paybackYears: number;
  lifetime25Profit: number;
  summerPct: number;
  fixedAnnual: number;
  /** MP Smart Billing — resolved sub-type label (e.g. LV2.2 · sanctioned-load ≤10 kW). */
  mpBillingSubTypeLabel?: string;
  /** Implied ₹/kWh from OCR Energy ÷ units when available. */
  effectiveTariffRateInrPerKwh?: number | null;
  /** One-line QA caption for installers. */
  mpSmartBillingCaption?: string;
  auditRows: AuditRow[];
  auditTotals: AuditRow;
  solarVsGrid: ReturnType<typeof computeSolarVsGrid>;
  environmental: ReturnType<typeof computeEnvironmentalImpact>;
  annualGen: number;
  annualUse: number;
  coverage: number;
  bom: DeckBomItem[];
  brands: ReturnType<typeof pickBrandSet>;
  emi: EmiRow[];
  paymentMilestones: PaymentMilestone[];
  amcOptions: AmcOption[];
  amcSelectedYears: 1 | 5 | 10;
  companyProfile: CompanyProfile;
  customerProfile: CustomerProfile;
  bankDetails: ProposalBankDetails;
  upiLink?: string;
  lang: ProposalLang;
};

const MONTH_KEYS: (keyof MonthlyUnits)[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const MONTH_ORDER_INDEX: Record<keyof MonthlyUnits, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

type AuditRow = {
  label: string;
  units: number;
  energy: number;
  fixed: number;
  duty: number;
  fuel: number;
  total: number;
};

type TotalCalibration = { intercept: number; slopePerUnit: number };

const n = (v: number) => Math.max(0, Math.round(Number(v) || 0));
const inr = (v: number) => `₹${n(v).toLocaleString("en-IN")}`;
const inrK = (v: number) => {
  const x = n(v);
  if (x >= 100000) return `₹${(x / 100000).toFixed(1)}L`;
  if (x >= 1000) return `₹${(x / 1000).toFixed(0)}k`;
  return `₹${x.toLocaleString("en-IN")}`;
};

// =============================================================================
// THEME — Apple Minimalist palette + font
// =============================================================================

const T = {
  white: "FFFFFF",
  ink: "0B132B",
  charcoal: "1F2937",
  body: "374151",
  mute: "6B7280",
  muteSoft: "94A3B8",
  border: "E5E7EB",
  borderSoft: "F1F5F9",
  bgSoft: "F8FAFC",
  bgCool: "F1F5F9",
  bgBlue: "EFF6FF",
  bgBlueDeep: "DBEAFE",
  bgRose: "FFF1F2",
  bgGreen: "ECFDF5",
  bgAmber: "FFFBEB",
  bgViolet: "F5F3FF",
  blue: "0A6CF1",
  blueDeep: "0747A6",
  green: "047857",
  greenSoft: "10B981",
  rose: "BE123C",
  amber: "B45309",
  violet: "7C3AED"
};

const FONT = "Calibri";

// =============================================================================
// AUDIT ROWS — kept compatible with the legacy + MP engines.
// =============================================================================

function computeTotalCalibration(rows: AuditRow[], monthActuals: Partial<Record<keyof MonthlyUnits, number>>): TotalCalibration | null {
  const points = MONTH_KEYS.map((key, idx) => {
    const actual = Number(monthActuals[key] ?? 0);
    if (!Number.isFinite(actual) || actual <= 0) return null;
    const modeled = Number(rows[idx]?.total ?? 0);
    const units = Number(rows[idx]?.units ?? 0);
    if (!Number.isFinite(units) || units <= 0) return null;
    return { units, delta: actual - modeled };
  }).filter((v): v is { units: number; delta: number } => v != null);
  if (points.length === 0) return null;
  if (points.length === 1) return { intercept: points[0].delta, slopePerUnit: 0 };
  const nPoints = points.length;
  const sumX = points.reduce((s, p) => s + p.units, 0);
  const sumY = points.reduce((s, p) => s + p.delta, 0);
  const sumXY = points.reduce((s, p) => s + p.units * p.delta, 0);
  const sumX2 = points.reduce((s, p) => s + p.units * p.units, 0);
  const denom = nPoints * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return { intercept: sumY / nPoints, slopePerUnit: 0 };
  const slopePerUnit = (nPoints * sumXY - sumX * sumY) / denom;
  const intercept = sumY / nPoints - slopePerUnit * (sumX / nPoints);
  return { intercept, slopePerUnit };
}

function normalizeBillMonthToKey(raw?: string): keyof MonthlyUnits | null {
  const s = String(raw || "").toLowerCase();
  if (s.includes("jan")) return "jan";
  if (s.includes("feb")) return "feb";
  if (s.includes("mar")) return "mar";
  if (s.includes("apr")) return "apr";
  if (s.includes("may")) return "may";
  if (s.includes("jun")) return "jun";
  if (s.includes("jul")) return "jul";
  if (s.includes("aug")) return "aug";
  if (s.includes("sep")) return "sep";
  if (s.includes("oct")) return "oct";
  if (s.includes("nov")) return "nov";
  if (s.includes("dec")) return "dec";
  return null;
}

function buildLegacyAuditRows(input: PremiumProposalPptInput, labels: string[]): {
  rows: AuditRow[]; totals: AuditRow; summerPct: number; fixedAnnual: number;
} {
  const units = MONTH_KEYS.map((k) => n(input.monthlyUnits[k]));
  const baseCtx = getFallbackTariffContext(input.state || "Madhya Pradesh", input.discom || "MPPKVVCL");
  const effectiveCtx = applyTariffCategoryOverride(baseCtx, {
    state: input.state || "Madhya Pradesh",
    discom: input.discom || "MPPKVVCL",
    tariffCategory: input.tariffCategory || input.connectionType || "",
    connectedLoadKw: input.connectedLoadKw,
    areaProfile: input.areaProfile
  });
  const isMpDomestic = /madhya/i.test(input.state || "") && /domestic|lv1\.2|light and fan/i.test(`${input.connectionType || ""} ${input.tariffCategory || ""}`);
  const rows: AuditRow[] = labels.map((label, i) => {
    const model = estimateMonthlyBillBreakdownWithContext(units[i], effectiveCtx);
    const subsidy = isMpDomestic && units[i] <= 150 ? n(units[i] * 1.0) : 0;
    const total = Math.max(0, n(model.total - subsidy));
    return { label, units: units[i], energy: n(model.energy), fixed: n(model.fixed), duty: n(model.duty), fuel: n(model.fuel), total };
  });
  for (let i = 0; i < rows.length; i += 1) if (!Number.isFinite(rows[i].units) || rows[i].units <= 0) rows[i].total = 0;
  const calibration = computeTotalCalibration(rows, input.monthlyBillActuals ?? {});
  if (calibration) {
    const actuals = MONTH_KEYS.map((k) => Number(input.monthlyBillActuals?.[k] ?? 0)).filter((v) => Number.isFinite(v) && v > 0);
    const avgActual = actuals.length > 0 ? actuals.reduce((s, v) => s + v, 0) / actuals.length : null;
    for (let i = 0; i < rows.length; i += 1) {
      const monthKey = MONTH_KEYS[i];
      const alreadyActual = n(Number(input.monthlyBillActuals?.[monthKey]) || 0) > 0;
      if (alreadyActual) continue;
      if (!Number.isFinite(rows[i].units) || rows[i].units <= 0) { rows[i].total = 0; continue; }
      const adjusted = rows[i].total + calibration.intercept + calibration.slopePerUnit * rows[i].units;
      const normalized = Math.max(0, n(adjusted));
      if (avgActual != null && normalized > avgActual * 1.6) rows[i].total = n(avgActual * 1.6);
      else rows[i].total = normalized;
    }
  }
  for (const monthKey of MONTH_KEYS) {
    const idx = MONTH_ORDER_INDEX[monthKey];
    const mappedAmount = n(Number(input.monthlyBillActuals?.[monthKey]) || 0);
    if (mappedAmount > 0 && idx >= 0 && idx < rows.length) rows[idx].total = mappedAmount;
  }
  const billMonthKey = normalizeBillMonthToKey(input.billMonth);
  const actualCurrentBill = n(Number(input.currentMonthBillAmountInr) || 0);
  if (billMonthKey && actualCurrentBill > 0) {
    const idx = MONTH_ORDER_INDEX[billMonthKey];
    if (idx >= 0 && idx < rows.length) rows[idx].total = actualCurrentBill;
  }
  const totals = rows.reduce((acc, r) => ({
    label: "Total", units: acc.units + r.units, energy: acc.energy + r.energy,
    fixed: acc.fixed + r.fixed, duty: acc.duty + r.duty, fuel: acc.fuel + r.fuel, total: acc.total + r.total
  }), { label: "Total", units: 0, energy: 0, fixed: 0, duty: 0, fuel: 0, total: 0 });
  const summer = rows.slice(3, 7).reduce((sum, r) => sum + r.total, 0);
  const summerPct = totals.total > 0 ? n((summer / totals.total) * 100) : 0;
  return { rows, totals, summerPct, fixedAnnual: totals.fixed };
}

function buildAuditRows(input: PremiumProposalPptInput, labels: string[]): {
  rows: AuditRow[];
  totals: AuditRow;
  summerPct: number;
  fixedAnnual: number;
  mode: "mp_2025_26" | "legacy";
  smartBilling?: import("@/lib/mp-smart-billing").MpSmartBillingResolution;
} {
  if (isMpProposalContext({ state: input.state, discom: input.discom })) {
    const merged: Partial<Record<keyof MonthlyUnits, number>> = { ...(input.monthlyBillActuals ?? {}) };
    const billMonthKey = normalizeBillMonthToKey(input.billMonth);
    const actualCurrentBill = n(Number(input.currentMonthBillAmountInr) || 0);
    if (billMonthKey && actualCurrentBill > 0 && !merged[billMonthKey]) merged[billMonthKey] = actualCurrentBill;
    const built = buildMpAuditRows({
      state: input.state,
      discom: input.discom,
      tariffCategory: input.tariffCategory,
      purposeOfSupply: input.purposeOfSupply,
      connectionType: input.connectionType,
      connectedLoadKw: input.connectedLoadKw,
      contractDemandKva: input.contractDemandKva,
      areaProfile: input.areaProfile,
      monthlyUnits: input.monthlyUnits,
      monthlyBillActuals: merged,
      monthlyAuditOverrides: input.monthlyAuditOverrides,
      monthlyFppasPct: input.monthlyFppasPct,
      agjyClaimed: input.agjyClaimed,
      billFixedChargeInr: input.billFixedChargeInr,
      billEnergyChargesInr: input.billEnergyChargesInr,
      billElectricityDutyInr: input.billElectricityDutyInr,
      referenceBillUnits: input.referenceBillUnits
    });
    const rows: AuditRow[] = built.rows.map((r, i) => ({
      label: labels[i],
      units: r.units,
      energy: r.energy,
      fixed: r.fixed,
      duty: r.duty,
      fuel: r.fuel,
      total: r.total
    }));
    const totals: AuditRow = {
      label: "Total",
      units: built.totals.units,
      energy: built.totals.energy,
      fixed: built.totals.fixed,
      duty: built.totals.duty,
      fuel: built.totals.fuel,
      total: built.totals.total
    };
    return {
      rows,
      totals,
      summerPct: built.summerPct,
      fixedAnnual: built.fixedAnnual,
      mode: "mp_2025_26",
      smartBilling: built.smartBilling
    };
  }
  return { ...buildLegacyAuditRows(input, labels), mode: "legacy", smartBilling: undefined };
}

// =============================================================================
// SUMMARIZER — single source of truth used by PPT + web.
// =============================================================================

export function summarizeProposalDeck(input: PremiumProposalPptInput): ProposalDeckSummary {
  const lang = input.lang ?? "en";
  const labels = monthLabels(lang);
  const { rows: auditRows, totals: auditTotals, summerPct, fixedAnnual, smartBilling } = buildAuditRows(input, labels);
  const yearlyBill = n(auditTotals.total > 0 ? auditTotals.total : input.yearlyBill);
  const afterSolar = n(input.afterSolar);
  const annualSaving = n(yearlyBill - afterSolar);
  const totalReduction = yearlyBill > 0 ? Math.round((annualSaving / yearlyBill) * 100) : 0;

  const brands = pickBrandSet({ preferredPanelBrand: input.panelBrand, systemKw: input.systemKw });
  const defaultBom = buildBom({ systemKw: input.systemKw, preferredPanelBrand: input.panelBrand });
  // Merge per-project BOM overrides on top of the default BOM, by slot.
  const overridesBySlot = new Map<number, NonNullable<typeof input.bomOverrides>[number]>();
  for (const o of input.bomOverrides ?? []) {
    if (o && Number.isFinite(o.slot)) overridesBySlot.set(Number(o.slot), o);
  }
  const bom = defaultBom.map((row) => {
    const o = overridesBySlot.get(row.slot);
    if (!o) return row;
    return {
      ...row,
      title: (o.title ?? row.title).toString(),
      spec: (o.spec ?? row.spec).toString(),
      brand: (o.brand ?? row.brand).toString(),
      warranty: (o.warranty ?? row.warranty).toString()
    };
  });
  const grossSystemCost = n(input.grossSystemCostInr ?? input.systemKw * 62400);
  const pmSubsidy = n(input.pmSuryaGharSubsidyInr ?? computePmSuryaGharSubsidy(input.systemKw));
  const netCost = n(input.netCostInr ?? Math.max(0, grossSystemCost - pmSubsidy));
  const paybackYears = honestPaybackYears({ paybackHint: input.paybackYears, netCostInr: netCost, annualSavingInr: annualSaving });
  const lifetime25Profit = n(annualSaving * 25 - netCost);
  const solarVsGrid = computeSolarVsGrid({ yearlyBill, netCostInr: netCost });
  const environmental = computeEnvironmentalImpact(input.systemKw);
  const annualGen = estimateAnnualGenerationUnits(input.systemKw);
  const annualUse = MONTH_KEYS.reduce((sum, k) => sum + n(input.monthlyUnits[k]), 0);
  const coverage = annualUse > 0 ? Math.min(100, Math.round((annualGen / annualUse) * 100)) : 100;
  const panels = Math.max(1, Math.ceil((input.systemKw * 1000) / 540));

  const finance = input.financeOption ?? {};
  const interestRatePct = Number.isFinite(finance.interestRatePct) ? Number(finance.interestRatePct) : 7;
  const tenuresYears = finance.tenuresYears && finance.tenuresYears.length > 0 ? finance.tenuresYears : [3, 5, 7];
  const emi = buildEmiTable(netCost, interestRatePct, tenuresYears);

  const paymentMilestones = buildPaymentMilestones(grossSystemCost);
  const amcOptions = buildAmcOptions(grossSystemCost, lang);
  const amcSelectedYears = (input.amcSelectedYears ?? 5) as 1 | 5 | 10;

  const baseCompany = defaultCompanyProfile(lang);
  const companyProfile: CompanyProfile = { ...baseCompany, ...(input.companyProfile ?? {}) };

  const customerProfile: CustomerProfile = input.customerProfile ?? {};
  const bankDetails: ProposalBankDetails = input.bankDetails ?? {};

  const upiLink = bankDetails.upiId
    ? buildUpiDeepLink({
        upiId: bankDetails.upiId,
        payeeName: bankDetails.accountName ?? input.installerName ?? "Harihar Solar",
        amountInr: paymentMilestones[0]?.amountInr ?? null,
        note: `${input.systemKw}kW Solar Advance`
      })
    : undefined;

  const mpSmartBillingCaption = smartBilling
    ? `${smartBilling.billingSubTypeLabel}${
        smartBilling.hadCategoryConflict ? " · header/purpose reconciled" : ""
      }${smartBilling.effectiveTariffRateInrPerKwh != null ? ` · ~₹${smartBilling.effectiveTariffRateInrPerKwh}/kWh from bill` : ""}`
    : undefined;

  return {
    honoredName: withHonorific(input.customerName),
    installer: (input.installerName ?? "Harihar Solar").trim(),
    tagline: (input.installerTagline ?? "100% Local · Satna · Madhya Pradesh").trim(),
    contact: (input.installerContact ?? "+91-9993322267 · harihar@solar.com").trim(),
    systemKw: input.systemKw,
    panelBrand: brands.panel,
    panels,
    yearlyBill,
    afterSolar,
    annualSaving,
    totalReduction,
    grossSystemCost,
    pmSubsidy,
    netCost,
    paybackYears,
    lifetime25Profit,
    summerPct,
    fixedAnnual,
    mpBillingSubTypeLabel: smartBilling?.billingSubTypeLabel,
    effectiveTariffRateInrPerKwh: smartBilling?.effectiveTariffRateInrPerKwh ?? null,
    mpSmartBillingCaption,
    auditRows,
    auditTotals,
    solarVsGrid,
    environmental,
    annualGen,
    annualUse,
    coverage,
    bom,
    brands,
    emi,
    paymentMilestones,
    amcOptions,
    amcSelectedYears,
    companyProfile,
    customerProfile,
    bankDetails,
    upiLink,
    lang
  };
}

// =============================================================================
// SLIDE PRIMITIVES
// =============================================================================

function topBar(pptx: PptxGenJS, slide: PptxGenJS.Slide, opts: {
  installer: string;
  tagline: string;
  pageNum: number;
  totalPages: number;
  logoUrl?: string;
}) {
  slide.background = { color: T.white };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: T.ink }, line: { color: T.ink, width: 0 } });

  let titleX = 0.5;
  if (opts.logoUrl) {
    try {
      slide.addImage({ path: opts.logoUrl, x: 0.4, y: 0.16, w: 0.42, h: 0.42 });
      titleX = 0.95;
    } catch { /* logo embed failed — fall through */ }
  }
  slide.addText(opts.installer.toUpperCase(), {
    x: titleX, y: 0.18, w: 5, h: 0.3,
    fontSize: 11, bold: true, color: T.ink, fontFace: FONT, charSpacing: 4
  });
  slide.addText(opts.tagline.toUpperCase(), {
    x: titleX, y: 0.42, w: 7, h: 0.22,
    fontSize: 8, color: T.mute, fontFace: FONT, charSpacing: 6
  });
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.25, y: 0.27, w: 0.16, h: 0.16, fill: { color: T.blue }, line: { color: T.blue, width: 0 } });
  slide.addText(`${String(opts.pageNum).padStart(2, "0")} / ${String(opts.totalPages).padStart(2, "0")}`, {
    x: 8.5, y: 5.3, w: 1.0, h: 0.22, fontSize: 9, color: T.mute, fontFace: FONT, align: "right"
  });
}

function sectionHeader(pptx: PptxGenJS, slide: PptxGenJS.Slide, opts: { kicker: string; title: string; subtitle?: string }) {
  slide.addText(opts.kicker.toUpperCase(), {
    x: 0.5, y: 0.85, w: 6, h: 0.3, fontSize: 11, color: T.blueDeep, fontFace: FONT, bold: true, charSpacing: 4
  });
  slide.addText(opts.title, {
    x: 0.5, y: 1.18, w: 9, h: 0.55, fontSize: 26, bold: true, color: T.ink, fontFace: FONT
  });
  if (opts.subtitle) {
    slide.addText(opts.subtitle, {
      x: 0.5, y: 1.7, w: 9, h: 0.25, fontSize: 11, color: T.mute, fontFace: FONT
    });
  }
}

function statChip(pptx: PptxGenJS, slide: PptxGenJS.Slide, opts: {
  x: number; y: number; w: number; h: number; label: string; value: string; tone?: "blue" | "ink" | "green" | "rose" | "amber";
}) {
  const tone = opts.tone ?? "ink";
  const valueColor = tone === "blue" ? T.blueDeep : tone === "green" ? T.green : tone === "rose" ? T.rose : tone === "amber" ? T.amber : T.ink;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fill: { color: T.bgSoft }, line: { color: T.border, width: 0.5 },
    rectRadius: 0.08
  });
  slide.addText(opts.label.toUpperCase(), {
    x: opts.x + 0.18, y: opts.y + 0.12, w: opts.w - 0.36, h: 0.22,
    fontSize: 8, color: T.mute, fontFace: FONT, bold: true, charSpacing: 3
  });
  slide.addText(opts.value, {
    x: opts.x + 0.18, y: opts.y + 0.36, w: opts.w - 0.36, h: opts.h - 0.5,
    fontSize: opts.h > 0.9 ? 22 : 16, bold: true, color: valueColor, fontFace: FONT,
    autoFit: true, shrinkText: true, valign: "middle"
  });
}

function insightCard(pptx: PptxGenJS, slide: PptxGenJS.Slide, opts: {
  x: number; y: number; w: number; h: number;
  title: string; bigValue: string; sub: string;
  bgColor: string; barColor: string;
}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fill: { color: opts.bgColor }, line: { color: T.border, width: 0.4 },
    rectRadius: 0.08
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: opts.x, y: opts.y + 0.1, w: 0.06, h: opts.h - 0.2,
    fill: { color: opts.barColor }, line: { color: opts.barColor, width: 0 }
  });
  slide.addText(opts.title.toUpperCase(), {
    x: opts.x + 0.22, y: opts.y + 0.13, w: opts.w - 0.36, h: 0.22,
    fontSize: 9, color: T.mute, fontFace: FONT, bold: true, charSpacing: 4
  });
  slide.addText(opts.bigValue, {
    x: opts.x + 0.22, y: opts.y + 0.4, w: opts.w - 0.36, h: 0.4,
    fontSize: 22, bold: true, color: T.ink, fontFace: FONT
  });
  slide.addText(opts.sub, {
    x: opts.x + 0.22, y: opts.y + 0.86, w: opts.w - 0.36, h: opts.h - 0.95,
    fontSize: 9, color: T.body, fontFace: FONT
  });
}

function profileRow(pptx: PptxGenJS, slide: PptxGenJS.Slide, opts: {
  x: number; y: number; w: number; rowH: number; cells: { label: string; value: string }[];
}) {
  const colW = opts.w / opts.cells.length;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.rowH,
    fill: { color: T.bgCool }, line: { color: T.border, width: 0.4 }, rectRadius: 0.08
  });
  opts.cells.forEach((c, i) => {
    const cx = opts.x + i * colW;
    if (i > 0) {
      slide.addShape(pptx.ShapeType.line, {
        x: cx, y: opts.y + 0.1, w: 0, h: opts.rowH - 0.2, line: { color: T.border, width: 0.5 }
      });
    }
    slide.addText(c.label.toUpperCase(), {
      x: cx + 0.15, y: opts.y + 0.1, w: colW - 0.3, h: 0.2,
      fontSize: 8, color: T.mute, fontFace: FONT, bold: true, charSpacing: 3
    });
    slide.addText(c.value || "—", {
      x: cx + 0.15, y: opts.y + 0.32, w: colW - 0.3, h: opts.rowH - 0.4,
      fontSize: 11, bold: true, color: T.ink, fontFace: FONT
    });
  });
}

async function generateQrDataUrl(payload?: string): Promise<string | null> {
  if (!payload) return null;
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 600,
      color: { dark: "#0B132B", light: "#FFFFFF" }
    });
  } catch (err) {
    console.warn("[proposal-ppt] QR generation failed:", err);
    return null;
  }
}

async function generateUpiQrDataUrl(upiLink?: string): Promise<string | null> {
  return generateQrDataUrl(upiLink);
}

// =============================================================================
// MAIN BUILD — 12-slide deck
// =============================================================================

const TOTAL_PAGES = 12;

export async function buildPremiumProposalPptBuffer(input: PremiumProposalPptInput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = input.installerName ?? "Harihar Solar";
  pptx.subject = "Premium solar proposal";
  pptx.title = `Premium proposal — ${input.customerName}`;

  const summary = summarizeProposalDeck(input);
  const lang = summary.lang;
  const D: ProposalDict = dict(lang);
  const labels = monthLabels(lang);
  const installer = summary.installer;
  const tagline = summary.tagline;
  const contact = summary.contact;
  const honoredName = summary.honoredName;
  const logoUrl = input.installerLogoUrl?.trim() || undefined;

  const upiQrDataUrl = await generateUpiQrDataUrl(summary.upiLink);
  // Fallback QR for slide 11 / slide 12 — points to the public web proposal link.
  const webProposalUrl = (input.webProposalUrl ?? "").trim();
  const webProposalQrDataUrl = webProposalUrl
    ? await generateQrDataUrl(webProposalUrl)
    : null;
  // Up to 6 site / past-installation photos (already validated upstream).
  const siteImages = (input.siteImages ?? []).filter((u) => typeof u === "string" && u.length > 0).slice(0, 6);

  // ---------------------------------------------------------------------------
  // SLIDE 1 — HERO COVER (logo top, customer profile center, system summary bottom)
  // ---------------------------------------------------------------------------
  const s1 = pptx.addSlide();
  topBar(pptx, s1, { installer, tagline, pageNum: 1, totalPages: TOTAL_PAGES, logoUrl });

  // Solar-blue hero band.
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0.72, w: 10, h: 0.08, fill: { color: T.blue }, line: { color: T.blue, width: 0 } });

  s1.addText(D["slide.cover.kicker"].toUpperCase(), {
    x: 0.5, y: 0.95, w: 6, h: 0.28, fontSize: 11, color: T.blueDeep, fontFace: FONT, bold: true, charSpacing: 4
  });
  s1.addText(D["common.preparedFor"], {
    x: 0.5, y: 1.22, w: 6, h: 0.22, fontSize: 10, color: T.mute, fontFace: FONT, italic: true
  });
  s1.addText(honoredName, {
    x: 0.5, y: 1.45, w: 9, h: 0.7, fontSize: 36, bold: true, color: T.ink, fontFace: FONT,
    autoFit: true, shrinkText: true, valign: "top"
  });
  s1.addText(input.location || "Madhya Pradesh", {
    x: 0.5, y: 2.08, w: 9, h: 0.28, fontSize: 12, color: T.body, fontFace: FONT,
    autoFit: true, shrinkText: true
  });

  // Customer profile two-row card (3 cells per row).
  const cp = summary.customerProfile;
  profileRow(pptx, s1, {
    x: 0.5, y: 2.5, w: 9, rowH: 0.7, cells: [
      { label: D["profile.consumerId"], value: profileFieldOrDash(cp.consumerId) },
      { label: D["profile.meterNo"], value: profileFieldOrDash(cp.meterNumber) },
      { label: D["profile.connectionDate"], value: profileFieldOrDash(cp.connectionDate) }
    ]
  });
  profileRow(pptx, s1, {
    x: 0.5, y: 3.25, w: 9, rowH: 0.7, cells: [
      { label: D["profile.connectionType"], value: profileFieldOrDash(cp.connectionType ?? input.connectionType) },
      { label: D["profile.phase"], value: profileFieldOrDash(cp.phase) },
      { label: D["profile.sanctionedLoad"], value: cp.sanctionedLoadKw ? `${cp.sanctionedLoadKw} kW` : profileFieldOrDash(input.connectedLoadKw ? `${input.connectedLoadKw} kW` : null) }
    ]
  });

  // System summary bar.
  const sumY = 4.2;
  const sumH = 0.95;
  const sumW = 1.7;
  const sumGap = 0.1;
  const summaryItems: { label: string; value: string; tone?: "blue" | "ink" | "green" | "rose" }[] = [
    { label: D["common.system"], value: `${input.systemKw} kW`, tone: "ink" },
    { label: D["common.panels"], value: String(summary.panels), tone: "ink" },
    { label: D["common.netCost"], value: inrK(summary.netCost), tone: "blue" },
    { label: D["common.payback"], value: `${summary.paybackYears.toFixed(1)} ${D["emi.years"]}`, tone: "green" },
    { label: D["common.lifeProfit"], value: inrK(summary.lifetime25Profit), tone: summary.lifetime25Profit > 0 ? "green" : "rose" }
  ];
  let sumX = 0.5;
  summaryItems.forEach((it) => {
    statChip(pptx, s1, { x: sumX, y: sumY, w: sumW, h: sumH, label: it.label, value: it.value, tone: it.tone });
    sumX += sumW + sumGap;
  });
  s1.addText(D["common.engineNote"], {
    x: 0.5, y: 5.32, w: 9, h: 0.2, fontSize: 9, color: T.mute, fontFace: FONT, italic: true
  });

  // ---------------------------------------------------------------------------
  // SLIDE 2 — DEEP AUDIT (12-month table + summer-trap bar chart)
  // ---------------------------------------------------------------------------
  const s2 = pptx.addSlide();
  topBar(pptx, s2, { installer, tagline, pageNum: 2, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s2, { kicker: D["slide.audit.kicker"], title: D["slide.audit.title"], subtitle: D["slide.audit.subtitle"] });

  // 12-row table (split into 2 sub-tables of 6 rows for compact layout).
  // Layout note: total width here MUST fit inside the slide (slide width = 10").
  // Two sub-tables × sum(colWs) + 0.2" gap, with tableLeft margin ≈ 0.4".
  const tableTop = 2.05;
  const tableLeft = 0.4;
  const colWs = [0.55, 0.6, 0.9, 0.78, 0.92, 0.8]; // 4.55 wide × 2 + 0.2 gap = 9.3 ≤ 9.2
  const rowH = 0.27;

  function drawAuditTable(left: number, startIdx: number, endIdx: number) {
    s2.addShape(pptx.ShapeType.rect, {
      x: left, y: tableTop, w: colWs.reduce((s, w) => s + w, 0), h: rowH,
      fill: { color: T.ink }, line: { color: T.ink, width: 0 }
    });
    const headers = [D["audit.month"], D["audit.units"], D["audit.energy"], D["audit.fixed"], D["audit.dutyFuel"], D["audit.total"]];
    let cx = left;
    headers.forEach((h, i) => {
      s2.addText(h, {
        x: cx + 0.05, y: tableTop, w: colWs[i] - 0.1, h: rowH,
        fontSize: 8, bold: true, color: T.white, fontFace: FONT, valign: "middle", align: i === 0 ? "left" : "right"
      });
      cx += colWs[i];
    });
    for (let i = startIdx; i < endIdx; i += 1) {
      const r = summary.auditRows[i];
      const yRow = tableTop + rowH * (i - startIdx + 1);
      const isPeak = i >= 3 && i <= 6;
      s2.addShape(pptx.ShapeType.rect, {
        x: left, y: yRow, w: colWs.reduce((s, w) => s + w, 0), h: rowH,
        fill: { color: isPeak ? T.bgRose : (i % 2 === 0 ? T.white : T.bgSoft) },
        line: { color: T.border, width: 0.3 }
      });
      cx = left;
      const cells = [r.label, String(r.units), inr(r.energy), inr(r.fixed), inr(r.duty + r.fuel), inr(r.total)];
      cells.forEach((c, j) => {
        s2.addText(c, {
          x: cx + 0.05, y: yRow, w: colWs[j] - 0.1, h: rowH,
          fontSize: 8, color: isPeak && j === cells.length - 1 ? T.rose : T.ink, fontFace: FONT, valign: "middle",
          align: j === 0 ? "left" : "right", bold: j === cells.length - 1 || j === 0,
          autoFit: true, shrinkText: true
        });
        cx += colWs[j];
      });
    }
  }

  drawAuditTable(tableLeft, 0, 6);
  drawAuditTable(tableLeft + colWs.reduce((s, w) => s + w, 0) + 0.2, 6, 12);

  // Totals row at bottom.
  const totalsW = colWs.reduce((s, w) => s + w, 0) * 2 + 0.2;
  const totalsY = tableTop + rowH * 7 + 0.05;
  s2.addShape(pptx.ShapeType.rect, {
    x: tableLeft, y: totalsY, w: totalsW, h: rowH + 0.05,
    fill: { color: T.bgBlue }, line: { color: T.blueDeep, width: 0.5 }
  });
  const totalsCells = [
    { l: D["audit.total"], v: "" },
    { l: "", v: String(summary.auditTotals.units) },
    { l: "", v: inr(summary.auditTotals.energy) },
    { l: "", v: inr(summary.auditTotals.fixed) },
    { l: "", v: inr(summary.auditTotals.duty + summary.auditTotals.fuel) },
    { l: "", v: inr(summary.auditTotals.total) }
  ];
  let tcx = tableLeft;
  totalsCells.forEach((c, i) => {
    s2.addText(c.l || c.v, {
      x: tcx + 0.05, y: totalsY, w: colWs[i] * 2 - 0.1 + (i === 5 ? 0.2 : 0), h: rowH + 0.05,
      fontSize: 9, bold: true, color: T.blueDeep, fontFace: FONT, valign: "middle",
      align: i === 0 ? "left" : "right",
      autoFit: true, shrinkText: true
    });
    tcx += colWs[i] * 2 + (i === 5 ? 0.2 : 0);
  });

  // Bar chart strip (Summer Trap) below table.
  const chartY = totalsY + rowH + 0.3;
  s2.addText(D["insight.summer.title"], {
    x: 0.5, y: chartY - 0.05, w: 5, h: 0.2, fontSize: 9, bold: true, color: T.rose, fontFace: FONT, charSpacing: 3
  });
  s2.addChart(
    pptx.ChartType.bar,
    [{ name: D["audit.netBill"], labels, values: summary.auditRows.map((r) => r.total) }],
    {
      x: 0.5, y: chartY + 0.15, w: 6.5, h: 1.0,
      barDir: "col",
      chartColors: [T.blue],
      showLegend: false, showTitle: false,
      catAxisLabelFontSize: 7, valAxisLabelFontSize: 7,
      catAxisLabelColor: T.mute, valAxisLabelColor: T.mute,
      catGridLine: { style: "none" }, valGridLine: { style: "solid", color: T.border, size: 0.5 }
    }
  );
  insightCard(pptx, s2, {
    x: 7.2, y: chartY + 0.1, w: 2.3, h: 1.05,
    title: D["insight.summer.title"], bigValue: `${summary.summerPct}%`,
    sub: D["insight.summer.sub"], bgColor: T.bgRose, barColor: T.rose
  });

  // ---------------------------------------------------------------------------
  // SLIDE 3 — ECONOMICS (Generation vs Usage + EMI Table)
  // ---------------------------------------------------------------------------
  const s3 = pptx.addSlide();
  topBar(pptx, s3, { installer, tagline, pageNum: 3, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s3, { kicker: D["slide.economics.kicker"], title: D["slide.economics.title"], subtitle: D["slide.economics.subtitle"] });

  // Generation vs Usage chart on the left.
  const monthlyGenUnits = Math.round(summary.annualGen / 12);
  const genVsUsageRows = summary.auditRows.map((r) => ({ label: r.label, gen: monthlyGenUnits, use: r.units }));
  s3.addChart(
    pptx.ChartType.bar,
    [
      { name: D["gen.annualGen"], labels, values: genVsUsageRows.map((r) => r.gen) },
      { name: D["gen.annualUse"], labels, values: genVsUsageRows.map((r) => r.use) }
    ],
    {
      x: 0.5, y: 2.05, w: 5.2, h: 2.1,
      barDir: "col", barGrouping: "clustered",
      chartColors: [T.greenSoft, T.blue],
      showLegend: true, legendPos: "b", legendFontSize: 8, legendColor: T.body,
      showTitle: false,
      catAxisLabelFontSize: 7, valAxisLabelFontSize: 7,
      catAxisLabelColor: T.mute, valAxisLabelColor: T.mute,
      catGridLine: { style: "none" }, valGridLine: { style: "solid", color: T.border, size: 0.5 }
    }
  );
  // 4 small chips below the chart for Daily / Annual Gen / Annual Use / Coverage.
  const econChipY = 4.3;
  const econChipW = 1.18;
  const econChipH = 0.85;
  let ecx = 0.5;
  [
    { l: D["gen.daily"], v: `${(summary.annualGen / 365).toFixed(1)} u/d` },
    { l: D["gen.annualGen"], v: `${summary.annualGen.toLocaleString("en-IN")} u`, tone: "green" as const },
    { l: D["gen.annualUse"], v: `${summary.annualUse.toLocaleString("en-IN")} u`, tone: "blue" as const },
    { l: D["gen.coverage"], v: `${summary.coverage}%`, tone: "green" as const }
  ].forEach((c) => {
    statChip(pptx, s3, { x: ecx, y: econChipY, w: econChipW, h: econChipH, label: c.l, value: c.v, tone: c.tone ?? "ink" });
    ecx += econChipW + 0.06;
  });

  // EMI table on the right.
  const emiX = 6.0;
  const emiY = 2.05;
  s3.addText(D["emi.title"].toUpperCase(), {
    x: emiX, y: emiY, w: 3.5, h: 0.25, fontSize: 11, bold: true, color: T.blueDeep, fontFace: FONT, charSpacing: 3
  });
  s3.addText(`${D["emi.principal"]}: ${inr(summary.netCost)}  •  ${D["emi.rate"]}: ${input.financeOption?.interestRatePct ?? 7}% p.a.`, {
    x: emiX, y: emiY + 0.27, w: 3.5, h: 0.22, fontSize: 9, color: T.mute, fontFace: FONT, italic: true
  });
  // Header row.
  const emiTopY = emiY + 0.55;
  const emiColWs = [0.7, 1.05, 0.9, 0.85];
  const emiHeaders = [D["emi.tenure"], D["emi.monthlyEmi"], D["emi.totalInterest"], D["emi.totalPayable"]];
  s3.addShape(pptx.ShapeType.rect, {
    x: emiX, y: emiTopY, w: emiColWs.reduce((s, w) => s + w, 0), h: 0.3,
    fill: { color: T.ink }, line: { color: T.ink, width: 0 }
  });
  let ecx2 = emiX;
  emiHeaders.forEach((h, i) => {
    s3.addText(h, {
      x: ecx2 + 0.05, y: emiTopY, w: emiColWs[i] - 0.1, h: 0.3,
      fontSize: 8, bold: true, color: T.white, fontFace: FONT, valign: "middle",
      align: i === 0 ? "left" : "right"
    });
    ecx2 += emiColWs[i];
  });
  summary.emi.forEach((row, i) => {
    const yr = emiTopY + 0.3 + i * 0.32;
    const selected = (input.financeOption?.selectedTenureYears ?? 0) === row.tenureYears;
    s3.addShape(pptx.ShapeType.rect, {
      x: emiX, y: yr, w: emiColWs.reduce((s, w) => s + w, 0), h: 0.32,
      fill: { color: selected ? T.bgGreen : i % 2 === 0 ? T.white : T.bgSoft },
      line: { color: T.border, width: 0.4 }
    });
    let cxr = emiX;
    const cells = [`${row.tenureYears} ${D["emi.years"]}`, `${inr(row.monthlyEmi)}/mo`, inr(row.totalInterest), inr(row.totalPayable)];
    cells.forEach((c, j) => {
      s3.addText(c, {
        x: cxr + 0.05, y: yr, w: emiColWs[j] - 0.1, h: 0.32,
        fontSize: 9, bold: j === 1 || selected, color: selected ? T.green : T.ink, fontFace: FONT,
        valign: "middle", align: j === 0 ? "left" : "right"
      });
      cxr += emiColWs[j];
    });
  });
  s3.addText(`✓ ${D["emi.financeCta"]}`, {
    x: emiX, y: emiTopY + 0.3 + summary.emi.length * 0.32 + 0.1, w: 3.5, h: 0.22,
    fontSize: 9, bold: true, color: T.green, fontFace: FONT
  });

  // ---------------------------------------------------------------------------
  // SLIDE 4 — ENVIRONMENTAL — YOUR GREEN LEGACY
  // ---------------------------------------------------------------------------
  const s4 = pptx.addSlide();
  topBar(pptx, s4, { installer, tagline, pageNum: 4, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s4, { kicker: D["slide.environment.kicker"], title: D["slide.environment.title"], subtitle: D["slide.environment.subtitle"] });

  const envTiles = [
    { glyph: "🍃", label: D["env.co2"], value: `${summary.environmental.lifetimeCo2TonsSaved} t`, tone: T.bgGreen, accent: T.green },
    { glyph: "🌳", label: D["env.trees"], value: summary.environmental.treeEquivalent.toLocaleString("en-IN"), tone: T.bgGreen, accent: T.green },
    { glyph: "☀️", label: D["env.solarYearly"], value: `${summary.annualGen.toLocaleString("en-IN")} u`, tone: T.bgBlue, accent: T.blue },
    { glyph: "✨", label: D["env.coverage"], value: `${summary.coverage}%`, tone: T.bgViolet, accent: T.violet }
  ];
  const envTileY = 2.1;
  const envTileW = 2.18;
  const envTileH = 1.7;
  let etx = 0.5;
  envTiles.forEach((t) => {
    s4.addShape(pptx.ShapeType.roundRect, {
      x: etx, y: envTileY, w: envTileW, h: envTileH,
      fill: { color: t.tone }, line: { color: T.border, width: 0.4 }, rectRadius: 0.1
    });
    s4.addText(t.glyph, {
      x: etx + 0.18, y: envTileY + 0.18, w: 1.0, h: 0.5, fontSize: 30, color: t.accent, fontFace: FONT
    });
    s4.addText(t.value, {
      x: etx + 0.18, y: envTileY + 0.72, w: envTileW - 0.36, h: 0.5,
      fontSize: 24, bold: true, color: T.ink, fontFace: FONT
    });
    s4.addText(t.label.toUpperCase(), {
      x: etx + 0.18, y: envTileY + 1.25, w: envTileW - 0.36, h: 0.3,
      fontSize: 9, color: T.mute, fontFace: FONT, bold: true, charSpacing: 3
    });
    etx += envTileW + 0.1;
  });

  // Bottom narrative band.
  s4.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 4.0, w: 9, h: 1.2, fill: { color: T.ink }, line: { color: T.ink, width: 0 }, rectRadius: 0.1
  });
  s4.addText(D["env.legacy.title"], {
    x: 0.7, y: 4.1, w: 8.6, h: 0.4, fontSize: 18, bold: true, color: T.white, fontFace: FONT
  });
  s4.addText(D["env.legacy.sub"], {
    x: 0.7, y: 4.5, w: 8.6, h: 0.6, fontSize: 11, color: T.muteSoft, fontFace: FONT
  });

  // ---------------------------------------------------------------------------
  // SLIDE 5 — ABOUT US (Harihar Solar) + 3 site-photo placeholders
  // ---------------------------------------------------------------------------
  const s5 = pptx.addSlide();
  topBar(pptx, s5, { installer, tagline, pageNum: 5, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s5, { kicker: D["slide.about.kicker"], title: D["slide.about.title"] });

  const aboutLeftW = 4.4;
  s5.addText(summary.companyProfile.aboutUsParagraphs.join("\n\n"), {
    x: 0.5, y: 2.1, w: aboutLeftW, h: 2.1, fontSize: 10.5, color: T.body, fontFace: FONT, paraSpaceAfter: 8
  });
  // 4 mini info chips.
  const aboutChipY = 4.25;
  const aboutChipW = 2.05;
  const aboutChipH = 0.9;
  [
    { l: D["about.founded"], v: summary.companyProfile.founded },
    { l: D["about.gst"], v: summary.companyProfile.gstNumber },
    { l: D["about.installations"], v: summary.companyProfile.installationsDone },
    { l: D["about.locations"], v: summary.companyProfile.locations }
  ].forEach((c, i) => {
    statChip(pptx, s5, {
      x: 0.5 + (i % 2) * (aboutChipW + 0.1),
      y: aboutChipY + Math.floor(i / 2) * (aboutChipH + 0.06),
      w: aboutChipW, h: aboutChipH,
      label: c.l, value: c.v, tone: "ink"
    });
  });

  // Right side: 3 photo placeholders.
  const photoX = 5.2;
  const photoTotalW = 4.3;
  const photoH = 1.4;
  const photoGap = 0.12;
  const slot1 = { x: photoX, y: 2.1, w: photoTotalW, h: photoH };
  const slot2 = { x: photoX, y: 2.1 + photoH + photoGap, w: (photoTotalW - photoGap) / 2, h: photoH };
  const slot3 = { x: photoX + (photoTotalW - photoGap) / 2 + photoGap, y: slot2.y, w: (photoTotalW - photoGap) / 2, h: photoH };
  [slot1, slot2, slot3].forEach((slot, i) => {
    const url = siteImages[i];
    if (url) {
      try {
        s5.addImage({ path: url, ...slot, sizing: { type: "cover", w: slot.w, h: slot.h } });
        return;
      } catch { /* fall through to placeholder */ }
    }
    s5.addShape(pptx.ShapeType.roundRect, {
      ...slot, fill: { color: T.bgCool }, line: { color: T.border, width: 0.5, dashType: "dash" }, rectRadius: 0.06
    });
    s5.addText(`📸  Site Photo ${i + 1}`, {
      ...slot, fontSize: 11, color: T.mute, fontFace: FONT, align: "center", valign: "middle", italic: true
    });
  });

  // ---------------------------------------------------------------------------
  // SLIDE 6 — TECHNICAL PROPOSAL — System Architecture & Project Scheme
  // ---------------------------------------------------------------------------
  const s6 = pptx.addSlide();
  topBar(pptx, s6, { installer, tagline, pageNum: 6, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s6, { kicker: D["slide.technical.kicker"], title: D["slide.technical.title"] });

  // Architecture flow blocks.
  const archY = 2.15;
  const blocks = [
    { title: "Solar Panels", sub: `${summary.panels} × 540W ${summary.brands.panel}`, color: T.blue },
    { title: "DC Cabling + DCDB", sub: "TUV 4mm² · SPD", color: T.blue },
    { title: "On-Grid Inverter", sub: `${input.systemKw} kW · MPPT`, color: T.violet },
    { title: "AC Cabling + ACDB", sub: "MCB · Earthing", color: T.violet },
    { title: "Net Meter", sub: "Bi-directional", color: T.green },
    { title: "MP Grid / Load", sub: "Energy export + import", color: T.green }
  ];
  const blkW = 1.4;
  const blkGap = 0.07;
  let bx = 0.5;
  blocks.forEach((b, i) => {
    s6.addShape(pptx.ShapeType.roundRect, {
      x: bx, y: archY, w: blkW, h: 1.0,
      fill: { color: T.bgSoft }, line: { color: b.color, width: 1 }, rectRadius: 0.1
    });
    s6.addText(b.title, {
      x: bx + 0.08, y: archY + 0.12, w: blkW - 0.16, h: 0.4, fontSize: 10, bold: true, color: T.ink, fontFace: FONT
    });
    s6.addText(b.sub, {
      x: bx + 0.08, y: archY + 0.5, w: blkW - 0.16, h: 0.45, fontSize: 8, color: T.mute, fontFace: FONT
    });
    if (i < blocks.length - 1) {
      s6.addShape(pptx.ShapeType.line, {
        x: bx + blkW, y: archY + 0.5, w: blkGap, h: 0,
        line: { color: T.charcoal, width: 1.2, endArrowType: "triangle" }
      });
    }
    bx += blkW + blkGap;
  });

  // Project scheme block — 5 stages.
  const planY = 3.6;
  s6.addText(D["tech.projectPlan"].toUpperCase(), {
    x: 0.5, y: planY, w: 9, h: 0.24, fontSize: 11, bold: true, color: T.blueDeep, fontFace: FONT, charSpacing: 3
  });
  const stages = lang === "hi"
    ? [
        { d: "दिन 1-2", t: "साइट सर्वे एवं डिज़ाइन", s: "छाया विश्लेषण, संरचनात्मक जांच" },
        { d: "दिन 3-5", t: "DISCOM आवेदन एवं ऑर्डर", s: "नेट-मीटर पंजीकरण, सब्सिडी फॉर्म" },
        { d: "दिन 6-7", t: "स्ट्रक्चर इंस्टॉलेशन", s: "GI रेल्स, माउंटिंग ब्रैकेट्स" },
        { d: "दिन 7-9", t: "पैनल एवं इन्वर्टर", s: "DC/AC वायरिंग, अर्थिंग" },
        { d: "दिन 9-10", t: "टेस्टिंग एवं नेट मीटर", s: "कमीशनिंग, हैंडओवर" }
      ]
    : [
        { d: "Day 1-2", t: "Site Survey & Design", s: "Shadow analysis, structural check" },
        { d: "Day 3-5", t: "DISCOM Application & Order", s: "Net-meter, subsidy forms filed" },
        { d: "Day 6-7", t: "Structure Installation", s: "GI rails, mounting brackets" },
        { d: "Day 7-9", t: "Panel & Inverter", s: "DC/AC wiring, earthing" },
        { d: "Day 9-10", t: "Testing & Net Meter", s: "Commissioning, handover" }
      ];
  const stageW = 1.74;
  let sx = 0.5;
  stages.forEach((st, i) => {
    s6.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: planY + 0.3, w: stageW, h: 1.5,
      fill: { color: T.white }, line: { color: T.border, width: 0.4 }, rectRadius: 0.08
    });
    s6.addShape(pptx.ShapeType.ellipse, {
      x: sx + 0.1, y: planY + 0.4, w: 0.3, h: 0.3,
      fill: { color: T.blue }, line: { color: T.blue, width: 0 }
    });
    s6.addText(String(i + 1), {
      x: sx + 0.1, y: planY + 0.4, w: 0.3, h: 0.3, fontSize: 11, bold: true, color: T.white, fontFace: FONT, align: "center", valign: "middle"
    });
    s6.addText(st.d.toUpperCase(), {
      x: sx + 0.45, y: planY + 0.4, w: stageW - 0.55, h: 0.3, fontSize: 8, bold: true, color: T.mute, fontFace: FONT, charSpacing: 3
    });
    s6.addText(st.t, {
      x: sx + 0.1, y: planY + 0.78, w: stageW - 0.2, h: 0.42, fontSize: 11, bold: true, color: T.ink, fontFace: FONT
    });
    s6.addText(st.s, {
      x: sx + 0.1, y: planY + 1.18, w: stageW - 0.2, h: 0.4, fontSize: 8, color: T.body, fontFace: FONT
    });
    sx += stageW + 0.07;
  });

  // ---------------------------------------------------------------------------
  // SLIDE 7 — TECHNICAL SPEC & BOM
  // ---------------------------------------------------------------------------
  const s7 = pptx.addSlide();
  topBar(pptx, s7, { installer, tagline, pageNum: 7, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s7, { kicker: D["slide.bom.kicker"], title: D["slide.bom.title"] });

  const bomTop = 2.1;
  const bomColWs = [0.4, 1.6, 3.6, 1.7, 1.7];
  const bomHeaders = ["#", D["bom.component"], D["bom.spec"], D["bom.brand"], D["bom.warranty"]];
  s7.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: bomTop, w: bomColWs.reduce((s, w) => s + w, 0), h: 0.32,
    fill: { color: T.ink }, line: { color: T.ink, width: 0 }
  });
  let bcx = 0.5;
  bomHeaders.forEach((h, i) => {
    s7.addText(h, {
      x: bcx + 0.06, y: bomTop, w: bomColWs[i] - 0.12, h: 0.32, fontSize: 9, bold: true, color: T.white, fontFace: FONT, valign: "middle"
    });
    bcx += bomColWs[i];
  });
  summary.bom.forEach((b, i) => {
    const yRow = bomTop + 0.32 + i * 0.42;
    s7.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: yRow, w: bomColWs.reduce((s, w) => s + w, 0), h: 0.42,
      fill: { color: i % 2 === 0 ? T.white : T.bgSoft }, line: { color: T.border, width: 0.3 }
    });
    let cxr = 0.5;
    const cells = [String(b.slot), b.title, b.spec, b.brand, b.warranty];
    cells.forEach((c, j) => {
      s7.addText(c, {
        x: cxr + 0.06, y: yRow, w: bomColWs[j] - 0.12, h: 0.42,
        fontSize: 9, bold: j === 0 || j === 1, color: j === 4 ? T.green : T.ink, fontFace: FONT, valign: "middle"
      });
      cxr += bomColWs[j];
    });
  });
  // Warranty highlight strip.
  const warrantyY = bomTop + 0.32 + summary.bom.length * 0.42 + 0.18;
  s7.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: warrantyY, w: 9, h: 0.7, fill: { color: T.bgBlue }, line: { color: T.borderSoft, width: 0.4 }, rectRadius: 0.08
  });
  s7.addText("⏻", { x: 0.7, y: warrantyY + 0.12, w: 0.5, h: 0.5, fontSize: 24, color: T.green, fontFace: FONT });
  s7.addText(`25 ${D["amc.years"]} ${D["bom.warranty"]} — ${lang === "hi" ? "पैनल पर" : "on Panels"}`, {
    x: 1.1, y: warrantyY + 0.18, w: 3.5, h: 0.35, fontSize: 11, bold: true, color: T.ink, fontFace: FONT
  });
  s7.addText("⚡", { x: 5.0, y: warrantyY + 0.12, w: 0.5, h: 0.5, fontSize: 24, color: T.blue, fontFace: FONT });
  s7.addText(`10 ${D["amc.years"]} ${D["bom.warranty"]} — ${lang === "hi" ? "इन्वर्टर पर" : "on Inverter"}`, {
    x: 5.4, y: warrantyY + 0.18, w: 3.5, h: 0.35, fontSize: 11, bold: true, color: T.ink, fontFace: FONT
  });

  // ---------------------------------------------------------------------------
  // SLIDE 8 — PAYMENT TERMS (25 / 50 / 20 / 5)
  // ---------------------------------------------------------------------------
  const s8 = pptx.addSlide();
  topBar(pptx, s8, { installer, tagline, pageNum: 8, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s8, { kicker: D["slide.payment.kicker"], title: D["slide.payment.title"] });

  // Big horizontal progress bar with 4 segments.
  const payBarY = 2.4;
  const payBarH = 0.55;
  const payBarTotalW = 9;
  let pbx = 0.5;
  const payColors = [T.blue, T.violet, T.green, T.amber];
  summary.paymentMilestones.forEach((m, i) => {
    const segW = (payBarTotalW * m.pct) / 100;
    s8.addShape(pptx.ShapeType.rect, {
      x: pbx, y: payBarY, w: segW, h: payBarH,
      fill: { color: payColors[i] }, line: { color: T.white, width: 1 }
    });
    s8.addText(`${m.pct}%`, {
      x: pbx, y: payBarY, w: segW, h: payBarH,
      fontSize: 16, bold: true, color: T.white, fontFace: FONT, align: "center", valign: "middle"
    });
    pbx += segW;
  });

  // 4 milestone cards under the bar.
  const milestoneTitles = [D["pay.advance"], D["pay.material"], D["pay.installation"], D["pay.commissioning"]];
  let mcx = 0.5;
  const mcW = 2.18;
  const mcH = 1.5;
  summary.paymentMilestones.forEach((m, i) => {
    s8.addShape(pptx.ShapeType.roundRect, {
      x: mcx, y: 3.2, w: mcW, h: mcH,
      fill: { color: T.bgSoft }, line: { color: payColors[i], width: 1 }, rectRadius: 0.1
    });
    s8.addShape(pptx.ShapeType.ellipse, {
      x: mcx + 0.18, y: 3.32, w: 0.4, h: 0.4,
      fill: { color: payColors[i] }, line: { color: payColors[i], width: 0 }
    });
    s8.addText(String(m.step), {
      x: mcx + 0.18, y: 3.32, w: 0.4, h: 0.4, fontSize: 14, bold: true, color: T.white, fontFace: FONT, align: "center", valign: "middle"
    });
    s8.addText(`${m.pct}%`, {
      x: mcx + 0.65, y: 3.32, w: mcW - 0.75, h: 0.4, fontSize: 16, bold: true, color: T.ink, fontFace: FONT
    });
    s8.addText(milestoneTitles[i], {
      x: mcx + 0.18, y: 3.78, w: mcW - 0.36, h: 0.45, fontSize: 10, bold: true, color: T.ink, fontFace: FONT
    });
    s8.addText(inr(m.amountInr), {
      x: mcx + 0.18, y: 4.18, w: mcW - 0.36, h: 0.3, fontSize: 12, bold: true, color: payColors[i], fontFace: FONT
    });
    mcx += mcW + 0.1;
  });

  // Total cost summary at bottom.
  s8.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 4.85, w: 9, h: 0.5, fill: { color: T.ink }, line: { color: T.ink, width: 0 }, rectRadius: 0.06
  });
  s8.addText(`${D["commercial.gross"]}: ${inr(summary.grossSystemCost)}  •  ${D["commercial.subsidy"]}: −${inr(summary.pmSubsidy)}  •  ${D["commercial.net"]}: ${inr(summary.netCost)}`, {
    x: 0.7, y: 4.88, w: 8.6, h: 0.45, fontSize: 11, bold: true, color: T.white, fontFace: FONT, valign: "middle"
  });

  // ---------------------------------------------------------------------------
  // SLIDE 9 — COMMERCIAL TERMS + AMC selection (1 / 5 / 10 yr)
  // ---------------------------------------------------------------------------
  const s9 = pptx.addSlide();
  topBar(pptx, s9, { installer, tagline, pageNum: 9, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s9, { kicker: D["slide.commercial.kicker"], title: D["slide.commercial.title"] });

  // Left column: cost breakdown.
  const costRows = [
    { l: D["commercial.gross"], v: inr(summary.grossSystemCost), tone: T.ink },
    { l: D["commercial.subsidy"], v: `−${inr(summary.pmSubsidy)}`, tone: T.green },
    { l: D["commercial.net"], v: inr(summary.netCost), tone: T.blueDeep, bold: true }
  ];
  const costX = 0.5;
  const costY = 2.1;
  costRows.forEach((row, i) => {
    s9.addShape(pptx.ShapeType.rect, {
      x: costX, y: costY + i * 0.5, w: 4.3, h: 0.5,
      fill: { color: i === 2 ? T.bgBlue : T.white }, line: { color: T.border, width: 0.4 }
    });
    s9.addText(row.l, {
      x: costX + 0.15, y: costY + i * 0.5, w: 2.3, h: 0.5, fontSize: 11, color: T.body, fontFace: FONT, valign: "middle", bold: row.bold
    });
    s9.addText(row.v, {
      x: costX + 2.4, y: costY + i * 0.5, w: 1.85, h: 0.5, fontSize: 14, bold: true, color: row.tone, fontFace: FONT, valign: "middle", align: "right"
    });
  });
  s9.addText(`✓ ${D["commercial.gst"]}`, {
    x: costX, y: costY + 1.65, w: 4.3, h: 0.25, fontSize: 9, color: T.green, fontFace: FONT, italic: true
  });

  // Right column: AMC option cards.
  s9.addText(D["slide.amc.kicker"].toUpperCase(), {
    x: 5.0, y: 2.1, w: 4.5, h: 0.25, fontSize: 11, bold: true, color: T.blueDeep, fontFace: FONT, charSpacing: 3
  });
  const amcY = 2.4;
  summary.amcOptions.forEach((opt, i) => {
    const yA = amcY + i * 1.0;
    const isSelected = opt.years === summary.amcSelectedYears;
    s9.addShape(pptx.ShapeType.roundRect, {
      x: 5.0, y: yA, w: 4.5, h: 0.92,
      fill: { color: isSelected ? T.bgGreen : T.bgSoft },
      line: { color: isSelected ? T.green : T.border, width: isSelected ? 1.2 : 0.4 },
      rectRadius: 0.08
    });
    // Checkbox.
    s9.addShape(pptx.ShapeType.roundRect, {
      x: 5.15, y: yA + 0.3, w: 0.32, h: 0.32,
      fill: { color: isSelected ? T.green : T.white },
      line: { color: isSelected ? T.green : T.mute, width: 1 },
      rectRadius: 0.04
    });
    if (isSelected) {
      s9.addText("✓", {
        x: 5.15, y: yA + 0.3, w: 0.32, h: 0.32,
        fontSize: 16, bold: true, color: T.white, fontFace: FONT, align: "center", valign: "middle"
      });
    }
    s9.addText(`${opt.years} ${opt.years === 1 ? D["amc.year"] : D["amc.years"]} ${D["amc.option"]}`, {
      x: 5.55, y: yA + 0.12, w: 2.5, h: 0.3, fontSize: 12, bold: true, color: T.ink, fontFace: FONT
    });
    s9.addText(opt.highlights.slice(0, 2).join(" · "), {
      x: 5.55, y: yA + 0.4, w: 3.0, h: 0.45, fontSize: 8.5, color: T.body, fontFace: FONT
    });
    s9.addText(opt.free ? "FREE" : inr(opt.totalInr), {
      x: 8.0, y: yA + 0.25, w: 1.4, h: 0.5, fontSize: 14, bold: true, color: opt.free ? T.green : T.ink, fontFace: FONT, align: "right", valign: "middle"
    });
  });

  // ---------------------------------------------------------------------------
  // SLIDE 10 — SERVICE & AMC plan details (Included / Excluded / Response / Escalation)
  // ---------------------------------------------------------------------------
  const s10 = pptx.addSlide();
  topBar(pptx, s10, { installer, tagline, pageNum: 10, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s10, { kicker: D["slide.amc.kicker"], title: D["slide.amc.title"] });

  const includedBullets = lang === "hi"
    ? [
        "त्रैमासिक पैनल सफाई + विद्युत जांच",
        "इन्वर्टर पैरामीटर मॉनिटरिंग",
        "DC/AC वायरिंग सत्यापन",
        "अर्थिंग एवं SPD जांच",
        "जनरेशन रिपोर्ट हर तिमाही"
      ]
    : [
        "Quarterly panel cleaning + electrical check",
        "Inverter parameter monitoring",
        "DC/AC wiring verification",
        "Earthing & SPD test",
        "Quarterly generation report"
      ];
  const excludedBullets = lang === "hi"
    ? [
        "साइट पर पानी एवं विद्युत आपूर्ति",
        "बीमा एवं भौतिक नुकसान",
        "इंटरनेट कनेक्शन",
        "वैंडालिज्म से क्षति"
      ]
    : [
        "Water + power at the site",
        "Insurance & physical damage",
        "Internet connectivity",
        "Vandalism damage"
      ];

  // Two-column "Included" / "Excluded".
  const plY = 2.1;
  s10.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: plY, w: 4.4, h: 2.1, fill: { color: T.bgGreen }, line: { color: T.green, width: 0.6 }, rectRadius: 0.1
  });
  s10.addText(`✓ ${D["amc.included"]}`, {
    x: 0.7, y: plY + 0.15, w: 4.0, h: 0.3, fontSize: 13, bold: true, color: T.green, fontFace: FONT
  });
  s10.addText(includedBullets.map((b) => `• ${b}`).join("\n"), {
    x: 0.7, y: plY + 0.5, w: 4.0, h: 1.5, fontSize: 10.5, color: T.body, fontFace: FONT, paraSpaceAfter: 4
  });

  s10.addShape(pptx.ShapeType.roundRect, {
    x: 5.1, y: plY, w: 4.4, h: 2.1, fill: { color: T.bgRose }, line: { color: T.rose, width: 0.6 }, rectRadius: 0.1
  });
  s10.addText(`✗ ${D["amc.excluded"]}`, {
    x: 5.3, y: plY + 0.15, w: 4.0, h: 0.3, fontSize: 13, bold: true, color: T.rose, fontFace: FONT
  });
  s10.addText(excludedBullets.map((b) => `• ${b}`).join("\n"), {
    x: 5.3, y: plY + 0.5, w: 4.0, h: 1.5, fontSize: 10.5, color: T.body, fontFace: FONT, paraSpaceAfter: 4
  });

  // Response time + Escalation.
  s10.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 4.35, w: 4.4, h: 0.85, fill: { color: T.bgBlue }, line: { color: T.blue, width: 0.4 }, rectRadius: 0.08
  });
  s10.addText("⚡", { x: 0.65, y: 4.45, w: 0.4, h: 0.5, fontSize: 24, color: T.blue, fontFace: FONT });
  s10.addText(D["amc.response"], {
    x: 1.05, y: 4.42, w: 3.5, h: 0.3, fontSize: 10, bold: true, color: T.blueDeep, fontFace: FONT
  });
  s10.addText(lang === "hi" ? "ब्रेकडाउन कॉल पर 24-48 घंटे में" : "On-site response within 24-48 hrs", {
    x: 1.05, y: 4.7, w: 3.5, h: 0.4, fontSize: 10, color: T.body, fontFace: FONT
  });

  s10.addShape(pptx.ShapeType.roundRect, {
    x: 5.1, y: 4.35, w: 4.4, h: 0.85, fill: { color: T.bgViolet }, line: { color: T.violet, width: 0.4 }, rectRadius: 0.08
  });
  s10.addText("📞", { x: 5.25, y: 4.45, w: 0.4, h: 0.5, fontSize: 22, color: T.violet, fontFace: FONT });
  s10.addText(D["amc.escalation"], {
    x: 5.65, y: 4.42, w: 3.7, h: 0.3, fontSize: 10, bold: true, color: T.violet, fontFace: FONT
  });
  s10.addText(`L1 ${contact}  →  L2 +91-9993322267`, {
    x: 5.65, y: 4.7, w: 3.7, h: 0.4, fontSize: 10, color: T.body, fontFace: FONT
  });

  // ---------------------------------------------------------------------------
  // SLIDE 11 — BANKING & PAYMENTS (Bank details + UPI QR)
  // ---------------------------------------------------------------------------
  const s11 = pptx.addSlide();
  topBar(pptx, s11, { installer, tagline, pageNum: 11, totalPages: TOTAL_PAGES, logoUrl });
  sectionHeader(pptx, s11, { kicker: D["slide.banking.kicker"], title: D["slide.banking.title"] });

  // Left column: bank details.
  const bnk = summary.bankDetails;
  const bankRows = [
    { l: D["bank.accountName"], v: bnk.accountName ?? installer },
    { l: D["bank.accountNumber"], v: bnk.accountNumber ?? "—" },
    { l: D["bank.ifsc"], v: bnk.ifsc ?? "—" },
    { l: D["bank.branch"], v: bnk.branch ?? "—" },
    { l: D["bank.upiId"], v: bnk.upiId ?? "—" }
  ];
  const bnkY = 2.1;
  bankRows.forEach((r, i) => {
    const yR = bnkY + i * 0.55;
    s11.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: yR, w: 5.2, h: 0.55,
      fill: { color: i % 2 === 0 ? T.white : T.bgSoft }, line: { color: T.border, width: 0.4 }
    });
    s11.addText(r.l.toUpperCase(), {
      x: 0.65, y: yR, w: 1.8, h: 0.55, fontSize: 9, color: T.mute, fontFace: FONT, bold: true, charSpacing: 3, valign: "middle"
    });
    s11.addText(r.v, {
      x: 2.45, y: yR, w: 3.2, h: 0.55, fontSize: 11, bold: true, color: T.ink, fontFace: FONT, valign: "middle"
    });
  });

  // Right column: chooses, in this order — (a) Site-Photo Gallery if any photos
  // are uploaded, (b) UPI QR if a UPI link is configured, (c) Web-Proposal QR
  // pointing to the public share link as a graceful fallback.
  const rightX = 6.0;
  const rightY = 2.05;
  const rightW = 3.7;
  const rightH = 3.15;

  s11.addShape(pptx.ShapeType.roundRect, {
    x: rightX, y: rightY, w: rightW, h: rightH,
    fill: { color: T.bgSoft }, line: { color: T.border, width: 0.5 }, rectRadius: 0.1
  });

  if (siteImages.length > 0) {
    // SITE PHOTO GALLERY — adaptive grid (1 / 2 / 3-4 / 5-6 photos).
    const galleryTitle = lang === "hi" ? "हमारे संस्थापन" : "Our Recent Installations";
    s11.addText(galleryTitle.toUpperCase(), {
      x: rightX + 0.2, y: rightY + 0.15, w: rightW - 0.4, h: 0.26,
      fontSize: 9, bold: true, color: T.blueDeep, fontFace: FONT, charSpacing: 4, align: "center"
    });

    const gx = rightX + 0.2;
    const gy = rightY + 0.5;
    const gw = rightW - 0.4;
    const gh = rightH - 0.7;
    const n = siteImages.length;

    let cols = 2;
    let rows = 2;
    if (n === 1) { cols = 1; rows = 1; }
    else if (n === 2) { cols = 2; rows = 1; }
    else if (n <= 4) { cols = 2; rows = 2; }
    else { cols = 3; rows = 2; }

    const gap = 0.08;
    const cellW = (gw - gap * (cols - 1)) / cols;
    const cellH = (gh - gap * (rows - 1)) / rows;

    for (let i = 0; i < n; i += 1) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cx = gx + c * (cellW + gap);
      const cy = gy + r * (cellH + gap);
      try {
        s11.addImage({ path: siteImages[i], x: cx, y: cy, w: cellW, h: cellH, sizing: { type: "cover", w: cellW, h: cellH } });
      } catch {
        s11.addShape(pptx.ShapeType.rect, {
          x: cx, y: cy, w: cellW, h: cellH,
          fill: { color: T.bgSoft }, line: { color: T.border, width: 0.4 }
        });
      }
    }
  } else {
    // QR FALLBACK — UPI first, web-link second, generic third.
    const qrPayload = upiQrDataUrl ?? webProposalQrDataUrl;
    const qrSize = 2.4;
    const qrInnerX = rightX + (rightW - qrSize) / 2;
    const qrInnerY = rightY + 0.25;
    if (qrPayload) {
      s11.addImage({ data: qrPayload, x: qrInnerX, y: qrInnerY, w: qrSize, h: qrSize });
    } else {
      s11.addText("📱", {
        x: qrInnerX, y: qrInnerY, w: qrSize, h: qrSize,
        fontSize: 80, align: "center", valign: "middle", color: T.mute, fontFace: FONT
      });
    }
    const captionLabel = upiQrDataUrl
      ? D["bank.scanQr"]
      : (lang === "hi" ? "वेब प्रपोजल देखने के लिए स्कैन करें" : "Scan to view this proposal online");
    s11.addText(captionLabel, {
      x: rightX + 0.2, y: rightY + rightH - 0.55, w: rightW - 0.4, h: 0.28,
      fontSize: 10, bold: true, color: T.ink, fontFace: FONT, align: "center", autoFit: true, shrinkText: true
    });
    if (upiQrDataUrl && bnk.upiId) {
      s11.addText(bnk.upiId, {
        x: rightX + 0.2, y: rightY + rightH - 0.28, w: rightW - 0.4, h: 0.22,
        fontSize: 9, color: T.mute, fontFace: FONT, align: "center", italic: true, autoFit: true, shrinkText: true
      });
    }
  }

  // Trust strip.
  s11.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 5.0, w: 9, h: 0.4, fill: { color: T.bgGreen }, line: { color: T.green, width: 0.4 }, rectRadius: 0.05
  });
  s11.addText(
    lang === "hi"
      ? "🔒 सभी भुगतान GST रसीद के साथ। RTGS/NEFT/UPI सभी विकल्प स्वीकार्य।"
      : "🔒 All payments are issued with a GST receipt. RTGS / NEFT / UPI all accepted.",
    { x: 0.7, y: 5.0, w: 8.6, h: 0.4, fontSize: 10, color: T.green, fontFace: FONT, valign: "middle", bold: true }
  );

  // ---------------------------------------------------------------------------
  // SLIDE 12 — CLOSING — Thank You + photos + contact
  // ---------------------------------------------------------------------------
  const s12 = pptx.addSlide();
  topBar(pptx, s12, { installer, tagline, pageNum: 12, totalPages: TOTAL_PAGES, logoUrl });

  s12.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.7, w: 10, h: 5.0, fill: { color: T.ink }, line: { color: T.ink, width: 0 }
  });

  s12.addText(D["common.thankYou"].toUpperCase(), {
    x: 0.5, y: 1.0, w: 9, h: 0.4, fontSize: 13, bold: true, color: T.muteSoft, fontFace: FONT, charSpacing: 6
  });
  s12.addText(`${honoredName}!`, {
    x: 0.5, y: 1.4, w: 9, h: 1.0, fontSize: 48, bold: true, color: T.white, fontFace: FONT
  });
  s12.addText(D["slide.closing.title"], {
    x: 0.5, y: 2.45, w: 9, h: 0.4, fontSize: 14, color: T.muteSoft, fontFace: FONT, italic: true
  });

  // 3 photo placeholders at bottom-half.
  const cphotoY = 3.05;
  const cphotoH = 1.5;
  const cphotoTotalW = 9;
  const cphotoCount = 3;
  const cphotoGap = 0.1;
  const cphotoW = (cphotoTotalW - (cphotoCount - 1) * cphotoGap) / cphotoCount;
  for (let i = 0; i < cphotoCount; i += 1) {
    const slot = { x: 0.5 + i * (cphotoW + cphotoGap), y: cphotoY, w: cphotoW, h: cphotoH };
    // Prefer last 3 photos for the closing slide (so slide 11 gallery and the
    // closing slide do not show the same images when 6 are uploaded). If only
    // 1–3 photos are available, reuse them.
    const url = siteImages.length >= 6 ? siteImages[i + 3] : siteImages[i % Math.max(siteImages.length, 1)];
    if (url) {
      try {
        s12.addImage({ path: url, ...slot, sizing: { type: "cover", w: slot.w, h: slot.h } });
        continue;
      } catch { /* placeholder */ }
    }
    s12.addShape(pptx.ShapeType.roundRect, {
      ...slot, fill: { color: T.charcoal }, line: { color: T.muteSoft, width: 0.4, dashType: "dash" }, rectRadius: 0.06
    });
    s12.addText(`📸  Site Photo ${i + 1}`, {
      ...slot, fontSize: 11, color: T.muteSoft, fontFace: FONT, align: "center", valign: "middle", italic: true
    });
  }

  // Contact strip.
  s12.addText(installer.toUpperCase(), {
    x: 0.5, y: 4.75, w: 5, h: 0.3, fontSize: 11, bold: true, color: T.white, fontFace: FONT, charSpacing: 4
  });
  s12.addText(contact, {
    x: 0.5, y: 5.05, w: 5, h: 0.25, fontSize: 10, color: T.muteSoft, fontFace: FONT
  });
  s12.addText(tagline, {
    x: 5.5, y: 4.85, w: 4, h: 0.5, fontSize: 10, color: T.muteSoft, fontFace: FONT, align: "right", valign: "middle"
  });

  const out = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}
