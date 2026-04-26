import { APP_DISPLAY_NAME, APP_LOGO_SRC } from "@/lib/app-brand";
import type { MonthlyUnits, SolarResult } from "@/lib/types";
import { emptyMonthlyUnits, type ParsedBillShape } from "@/lib/bill-parse";
import type { ProposalThemePreset } from "@/lib/proposal-branding-settings";

function n(value: number) {
  return Math.round(value || 0).toLocaleString("en-IN");
}

export type ProposalBranding = {
  installerName: string;
  installerContact?: string;
  installerLogoUrl?: string;
  personalizedBranding?: boolean;
};

export type ProposalHtmlBuildOptions = {
  monthlyUnits?: MonthlyUnits;
  branding?: ProposalBranding;
  tariffLabel?: string;
  themePreset?: ProposalThemePreset;
};

const CHART_MONTH_KEYS: (keyof MonthlyUnits)[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
];
const CHART_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slideHeaderHtml(slideTitle: string, branding: ProposalBranding): string {
  const nameEsc = escHtml(branding.installerName);
  const url = branding.installerLogoUrl?.trim();
  const personalized = branding.personalizedBranding !== false;
  const left = url
    ? `<img class="${personalized ? "installer-logo" : "installer-logo-balanced"}" src="${escAttr(url)}" alt="${escAttr(branding.installerName)}" />`
    : `<div class="${personalized ? "installer-nameplate" : "installer-nameplate-balanced"}">${nameEsc}</div>`;
  const poweredBy = personalized
    ? `<div class="prop-ss-mini"><span class="prop-pb">Powered by</span><img src="${APP_LOGO_SRC}" alt="" class="prop-ss-img"/></div>`
    : `<div class="prop-ss-balanced"><img src="${APP_LOGO_SRC}" alt="" class="prop-ss-img-balanced"/><span class="prop-pb">${APP_DISPLAY_NAME}</span></div>`;
  return `<div class="prop-header">
    <div class="prop-brand-big">${left}</div>
    <div class="prop-slide-title">${escAttr(slideTitle)}</div>
    ${poweredBy}
  </div>`;
}

function footerInstallerBrandHtml(branding: ProposalBranding): string {
  const url = branding.installerLogoUrl?.trim();
  if (url) {
    return `<img class="footer-installer-logo" src="${escAttr(url)}" alt="${escAttr(branding.installerName)}" />`;
  }
  return `<span class="footer-installer-name">${escHtml(branding.installerName)}</span>`;
}

function slideFooterHtml(input: {
  idx: number;
  total: number;
  customerName: string;
  discom: string;
  branding: ProposalBranding;
}): string {
  return `<div class="footer">
    <div class="footer-left">${footerInstallerBrandHtml(input.branding)}</div>
    <div class="footer-center">${escHtml(input.customerName)} • ${escHtml(input.discom)} • Slide ${input.idx}/${input.total}</div>
    <div class="footer-right"><img class="footer-sol-logo" src="${APP_LOGO_SRC}" alt="${APP_DISPLAY_NAME}" /></div>
  </div>`;
}

const BILL_PROBLEM_MONTH_ORDER: (keyof MonthlyUnits)[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
];

const BILL_PROBLEM_MONTH_LABEL: Record<keyof MonthlyUnits, string> = {
  jan: "J",
  feb: "F",
  mar: "M",
  apr: "A",
  may: "M",
  jun: "J",
  jul: "J",
  aug: "A",
  sep: "S",
  oct: "O",
  nov: "N",
  dec: "D"
};

function inrFromBillField(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
  const s = String(v).replace(/[₹,\s]/g, "").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Instant Slide 2 & 3 after smart bill scan — same visual system as full proposal. */
export function buildBillProblemSlidesHtml(
  result: SolarResult,
  bill: ParsedBillShape | null,
  monthlyUnits: MonthlyUnits
): string {
  const branding: ProposalBranding = { installerName: `${APP_DISPLAY_NAME} Partner` };
  const customerName = bill?.name?.trim() || "Customer";
  const discom = bill?.discom?.trim() || "DISCOM";
  const state = bill?.state?.trim() || "State";
  const month = bill?.bill_month?.trim() || "Current Cycle";
  const consumerId = bill?.consumer_id?.trim() || "—";
  const meterNo = bill?.meter_number?.trim() || "—";
  const connDate = bill?.connection_date?.trim() || "—";
  const phase = bill?.phase?.trim() || "—";
  const connType = bill?.connection_type?.trim() || "—";
  const sanctioned = bill?.sanctioned_load?.trim() || "—";
  const tariffCat = bill?.tariff_category?.trim() || "—";
  const address = bill?.address?.trim() || "—";
  const today = new Date().toLocaleDateString("en-IN");
  const yearlyBillNow = result.currentMonthlyBill * 12;

  const fixedInr = inrFromBillField(bill?.fixed_charges_inr);
  const energyInr = inrFromBillField(bill?.energy_charges_inr);
  const totalInr = inrFromBillField(bill?.total_amount_payable_inr);

  const values = BILL_PROBLEM_MONTH_ORDER.map((k) => Math.max(0, monthlyUnits[k] || 0));
  const maxU = Math.max(...values, 1);
  const bars = BILL_PROBLEM_MONTH_ORDER.map((k, i) => {
    const v = values[i] ?? 0;
    const h = Math.max(6, Math.round((v / maxU) * 100));
    return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="width:100%;max-width:22px;height:120px;display:flex;align-items:flex-end;background:#eef4fb;border-radius:6px 6px 0 0">
        <div style="width:100%;height:${h}%;background:linear-gradient(180deg,#00A88F 0%,#17BEBB 100%);border-radius:999px" title="${String(v)} units"></div>
      </div>
      <span style="font-size:9px;font-weight:800;color:#5d738d">${BILL_PROBLEM_MONTH_LABEL[k]}</span>
    </div>`;
  }).join("");

  const slide = (idx: number, title: string, content: string) => `
    <section class="slide">
      <div class="header">
        <img class="brand" src="${APP_LOGO_SRC}" alt="logo" />
        <div class="title">${title}</div>
      </div>
      ${content}
      ${slideFooterHtml({ idx, total: 15, customerName, discom, branding })}
    </section>
  `;

  const fixedPill =
    fixedInr != null
      ? `<span class="pill">Fixed charges (bill): ₹${fixedInr.toLocaleString("en-IN")}</span>`
      : "";
  const energyPill =
    energyInr != null
      ? `<span class="pill">Energy charges (bill): ₹${energyInr.toLocaleString("en-IN")}</span>`
      : "";
  const totalPill =
    totalInr != null ? `<span class="pill">Bill total: ₹${totalInr.toLocaleString("en-IN")}</span>` : "";

  const slide2 = slide(
    2,
    "Current Electricity Problem",
    `
    <div class="kpi" style="color:#c0392b">₹${n(yearlyBillNow)}</div>
    <div class="small">Yearly electricity outflow (estimated from units + tariff model). Fixed charges on bill add to the pain — see Slide 3.</div>
    <div class="pills">
      <span class="pill">Monthly avg: ₹${n(result.currentMonthlyBill)}</span>
      <span class="pill">Annual units: ${n(result.annualUnits)}</span>
      <span class="pill">DISCOM: ${discom}</span>
      ${fixedPill}
      ${energyPill}
      ${totalPill}
    </div>
    <div class="small" style="margin-top:14px;font-weight:700;color:#1e73be">Monthly units (from bill / history)</div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:2px;margin-top:8px;padding:8px 4px;background:#f7fbff;border-radius:12px;border:1px solid #dce8f6">
      ${bars}
    </div>
    `
  );

  const billAmountCards =
    fixedInr != null || energyInr != null || totalInr != null
      ? `
      <div class="grid" style="margin-bottom:10px">
        ${fixedInr != null ? `<div class="card"><div class="label">Fixed charges (bill)</div><div class="value" style="font-size:20px">₹${fixedInr.toLocaleString("en-IN")}</div></div>` : ""}
        ${energyInr != null ? `<div class="card"><div class="label">Energy charges (bill)</div><div class="value" style="font-size:20px">₹${energyInr.toLocaleString("en-IN")}</div></div>` : ""}
        ${totalInr != null ? `<div class="card"><div class="label">Amount payable (bill)</div><div class="value" style="font-size:20px">₹${totalInr.toLocaleString("en-IN")}</div></div>` : ""}
      </div>
    `
      : "";

  const slide3 = slide(
    3,
    "Bill Analysis Snapshot",
    `
    ${billAmountCards}
    <div class="grid">
      <div class="card"><div class="label">DISCOM</div><div class="value" style="font-size:17px">${discom}</div></div>
      <div class="card"><div class="label">State</div><div class="value" style="font-size:17px">${state}</div></div>
      <div class="card"><div class="label">Consumer ID</div><div class="value" style="font-size:15px">${consumerId}</div></div>
      <div class="card"><div class="label">Meter no.</div><div class="value" style="font-size:15px">${meterNo}</div></div>
      <div class="card"><div class="label">Connection date</div><div class="value" style="font-size:15px">${connDate}</div></div>
      <div class="card"><div class="label">Phase</div><div class="value" style="font-size:16px">${phase}</div></div>
      <div class="card"><div class="label">Connection type</div><div class="value" style="font-size:15px">${connType}</div></div>
      <div class="card"><div class="label">Sanctioned load</div><div class="value" style="font-size:15px">${sanctioned}</div></div>
      <div class="card"><div class="label">Tariff / category</div><div class="value" style="font-size:15px">${tariffCat}</div></div>
      <div class="card"><div class="label">Billing address</div><div class="value" style="font-size:14px">${address}</div></div>
      <div class="card"><div class="label">Bill month</div><div class="value" style="font-size:17px">${month}</div></div>
    </div>
    <div class="small" style="margin-top:12px">${APP_DISPLAY_NAME} • Scan ${today} • Full 15-slide proposal baad mein generate karo.</div>
    `
  );

  const slides = [slide2, slide3];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bill Problem — ${customerName}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Montserrat", Inter, Arial, sans-serif; background: #edf3f8; color: #0b2240; }
    .wrap { max-width: 900px; margin: 24px auto; display: grid; gap: 14px; }
    .slide { background: #fff; border-radius: 16px; border: 1px solid #d8e4f3; min-height: 520px; padding: 24px; position: relative; overflow: hidden; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e6edf5; padding-bottom: 10px; margin-bottom: 14px; }
    .brand { height: 38px; width: auto; }
    .title { font-size: 12px; font-weight: 700; letter-spacing: .08em; color: #1e73be; text-transform: uppercase; }
    .hero { font-size: 34px; font-weight: 900; color: #1a5c20; margin: 8px 0; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
    .card { border: 1px solid #dce8f6; border-radius: 12px; padding: 12px; background: #f7fbff; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #5d738d; }
    .value { font-size: 22px; font-weight: 900; color: #0b3c5d; margin-top: 4px; }
    .footer { position: absolute; left: 24px; right: 24px; bottom: 16px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; font-size: 10px; color: #607488; }
    .footer-left { justify-self: start; display: flex; align-items: center; }
    .footer-center { justify-self: center; font-weight: 700; letter-spacing: .02em; }
    .footer-right { justify-self: end; display: flex; align-items: center; }
    .footer-installer-logo { max-height: 18px; width: auto; object-fit: contain; }
    .footer-installer-name { font-size: 10px; font-weight: 800; color: #0D2C54; }
    .footer-sol-logo { max-height: 16px; width: auto; opacity: .85; }
    .kpi { font-size: 42px; font-weight: 900; color: #15994f; line-height: 1; }
    .small { font-size: 13px; color: #4b627a; }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .pill { background: #e9f4ff; color: #0b3c5d; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; }
    @media print {
      .wrap { margin: 0; }
      .slide { page-break-after: always; border: none; border-radius: 0; min-height: 100vh; }
    }
  </style>
</head>
<body>
  <div class="wrap">${slides.join("")}</div>
</body>
</html>`;
}

export function buildProposalHtml(
  result: SolarResult,
  bill: ParsedBillShape | null,
  options?: ProposalHtmlBuildOptions
) {
  const monthlyUnits = options?.monthlyUnits ?? emptyMonthlyUnits();
  const branding: ProposalBranding = options?.branding ?? { installerName: `${APP_DISPLAY_NAME} Partner` };
  const installerContact = branding.installerContact?.trim() || "+91-9993322267";
  const themePreset = options?.themePreset ?? "greenBlueClassic";
  const tariffLabel = options?.tariffLabel?.trim() ?? "";

  const customerName = bill?.name?.trim() || "Customer";
  const discom = bill?.discom?.trim() || "DISCOM";
  const state = bill?.state?.trim() || "State";
  const month = bill?.bill_month?.trim() || "Current Cycle";
  const consumerId = bill?.consumer_id?.trim() || "—";
  const meterNo = bill?.meter_number?.trim() || "—";
  const connDate = bill?.connection_date?.trim() || "—";
  const phase = bill?.phase?.trim() || "—";
  const connType = bill?.connection_type?.trim() || "—";
  const sanctioned = bill?.sanctioned_load?.trim() || "—";
  const tariffCat = bill?.tariff_category?.trim() || "—";
  const address = bill?.address?.trim() || "—";
  const today = new Date().toLocaleDateString("en-IN");
  const grossSubsidy = Math.max(0, result.grossCost - result.netCost);
  const yearlyBillNow = result.currentMonthlyBill * 12;
  const yearlyBillAfter = result.newMonthlyBill * 12;
  const savingPct = yearlyBillNow > 0 ? Math.round(((yearlyBillNow - yearlyBillAfter) / yearlyBillNow) * 100) : 90;
  const roofArea = Math.round(result.solarKw * 95);
  const monthlyNetSaving = Math.max(0, result.currentMonthlyBill - result.newMonthlyBill);

  const unitBars = CHART_MONTH_KEYS.map((k) => monthlyUnits[k] || 0);
  const paybackCeil = Math.max(1, Math.ceil(result.paybackYears));
  const paybackHorizon = Math.min(16, Math.max(paybackCeil + 4, 6));
  const payLabelsArr = Array.from({ length: paybackHorizon + 1 }, (_, i) => (i === 0 ? "Start" : `Year ${i}`));
  const savingsLine = Array.from({ length: paybackHorizon + 1 }, (_, i) => Math.round(i * result.annualSavings));
  const netLine = Array.from({ length: paybackHorizon + 1 }, () => result.netCost);

  const tariffPill =
    tariffLabel.length > 0
      ? `<span class="pill">Tariff engine: ${escHtml(tariffLabel)}</span>`
      : "";

  const slide = (idx: number, title: string, content: string) => `
    <section class="slide">
      ${slideHeaderHtml(title, branding)}
      ${content}
      ${slideFooterHtml({ idx, total: 15, customerName, discom, branding })}
    </section>
  `;

  const slides = [
    slide(
      1,
      "Proposal Cover",
      `
      <div class="cover-layout">
        <div class="hero-cover">
          <div class="hero-cover-bg"></div>
          <div class="hero-cover-card">
            <div class="hero-cover-label">Exclusive Solar Transition Plan</div>
            <div class="hero-cover-title">Proposal for ${customerName.toUpperCase()}</div>
            <div class="hero-cover-sub">${state} • ${month}</div>
          </div>
        </div>
        <div class="cover-analytics">
          <div class="cover-kpi-grid">
            <div class="card"><div class="label">System Size</div><div class="value" style="font-size:26px">${result.solarKw} kW</div></div>
            <div class="card"><div class="label">Annual Saving</div><div class="value" style="font-size:26px">₹${n(result.annualSavings)}</div></div>
            <div class="card"><div class="label">Payback</div><div class="value" style="font-size:24px">${result.paybackDisplay}</div></div>
            <div class="card"><div class="label">Savings %</div><div class="value" style="font-size:24px">${savingPct}%</div></div>
          </div>
          <div class="cover-inline-metrics">
            <span class="pill">Current monthly bill: ₹${n(result.currentMonthlyBill)}</span>
            <span class="pill">After solar monthly: ₹${n(result.newMonthlyBill)}</span>
            <span class="pill">Monthly net relief: ₹${n(monthlyNetSaving)}</span>
          </div>
        </div>
      </div>
      <div class="cover-details-grid">
        <div class="cover-detail"><span>Consumer ID</span><strong>${consumerId}</strong></div>
        <div class="cover-detail"><span>Meter No.</span><strong>${meterNo}</strong></div>
        <div class="cover-detail"><span>Connection Type</span><strong>${connType}</strong></div>
        <div class="cover-detail"><span>Phase</span><strong>${phase}</strong></div>
        <div class="cover-detail"><span>Tariff Category</span><strong>${tariffCat}</strong></div>
        <div class="cover-detail"><span>Sanctioned Load</span><strong>${sanctioned}</strong></div>
        <div class="cover-detail cover-detail-wide"><span>Billing Address</span><strong>${address}</strong></div>
      </div>
      `
    ),
    slide(
      2,
      "Current Electricity Problem",
      `
      <div class="kpi" style="color:#c0392b">₹${n(yearlyBillNow)}</div>
      <div class="small">Yearly electricity outflow — bijli problem (DISCOM rules + units).</div>
      <div class="pills">
        <span class="pill">Monthly Avg: ₹${n(result.currentMonthlyBill)}</span>
        <span class="pill">Annual Units: ${n(result.annualUnits)}</span>
        ${tariffPill}
      </div>
      <div class="chart-wrap"><canvas id="chart-slide-2" width="800" height="260"></canvas></div>
      <div class="small" style="margin-top:6px">Bar chart: month-wise units (kWh) from bill history.</div>
      `
    ),
    slide(
      3,
      "Bill Analysis Snapshot",
      `
      <div class="grid">
        <div class="card"><div class="label">DISCOM</div><div class="value" style="font-size:17px">${discom}</div></div>
        <div class="card"><div class="label">State</div><div class="value" style="font-size:17px">${state}</div></div>
        <div class="card"><div class="label">Consumer ID</div><div class="value" style="font-size:15px">${consumerId}</div></div>
        <div class="card"><div class="label">Meter no.</div><div class="value" style="font-size:15px">${meterNo}</div></div>
        <div class="card"><div class="label">Connection date</div><div class="value" style="font-size:15px">${connDate}</div></div>
        <div class="card"><div class="label">Phase</div><div class="value" style="font-size:16px">${phase}</div></div>
        <div class="card"><div class="label">Connection type</div><div class="value" style="font-size:15px">${connType}</div></div>
        <div class="card"><div class="label">Sanctioned load</div><div class="value" style="font-size:15px">${sanctioned}</div></div>
        <div class="card"><div class="label">Tariff / category</div><div class="value" style="font-size:15px">${tariffCat}</div></div>
        <div class="card"><div class="label">Billing address</div><div class="value" style="font-size:14px">${address}</div></div>
        <div class="card"><div class="label">Bill month</div><div class="value" style="font-size:17px">${month}</div></div>
      </div>
      `
    ),
    slide(
      4,
      "Hidden Billing Reality",
      `
      <div class="villain-slide">
        <div class="villain-title">HIDDEN BILLING REALITY</div>
        <div class="villain-grid">
          <div class="villain-card villain-card-danger">
            <div class="villain-label">Current Bill</div>
            <div class="villain-value">₹${n(yearlyBillNow)}</div>
          </div>
          <div class="villain-arrow">${savingPct}% Saving</div>
          <div class="villain-card villain-card-success">
            <div class="villain-label">After Solar Bill</div>
            <div class="villain-value">₹${n(yearlyBillAfter)}</div>
          </div>
        </div>
      </div>
      `
    ),
    slide(
      5,
      "Recommended Solar Solution",
      `
      <div class="grid">
        <div class="card"><div class="label">System Size</div><div class="value">${result.solarKw} kW</div></div>
        <div class="card"><div class="label">Panels (540W)</div><div class="value">${result.panels}</div></div>
        <div class="card"><div class="label">Annual Generation</div><div class="value">${n(result.annualGeneration)}</div></div>
        <div class="card"><div class="label">Roof Area</div><div class="value">${n(roofArea)} sqft</div></div>
      </div>
      `
    ),
    slide(
      6,
      "Generation vs Consumption",
      `
      <div class="grid">
        <div class="card"><div class="label">Consumption</div><div class="value">${n(result.annualUnits)}</div></div>
        <div class="card"><div class="label">Solar Generation</div><div class="value">${n(result.annualGeneration)}</div></div>
      </div>
      <div class="small" style="margin-top:10px">Design target: high self-consumption + lower bill volatility.</div>
      `
    ),
    slide(
      7,
      "Investment & Subsidy",
      `
      <div class="grid">
        <div class="card"><div class="label">Gross Cost</div><div class="value">₹${n(result.grossCost)}</div></div>
        <div class="card"><div class="label">Subsidy</div><div class="value">₹${n(grossSubsidy)}</div></div>
        <div class="card"><div class="label">Net Cost</div><div class="value">₹${n(result.netCost)}</div></div>
      </div>
      `
    ),
    slide(
      8,
      "Savings Breakdown",
      `
      <div class="hero">₹${n(result.monthlySavings)} / month</div>
      <div class="kpi">₹${n(result.annualSavings)} / year</div>
      <div class="small">Solar se recurring cashflow relief starts from month one.</div>
      <div class="grid" style="margin-top:14px">
        <div class="card"><div class="label">Bill Reduction</div><div class="value" style="font-size:22px">${savingPct}%</div></div>
        <div class="card"><div class="label">After-Solar Bill</div><div class="value" style="font-size:22px">₹${n(result.newMonthlyBill)}/mo</div></div>
        <div class="card"><div class="label">Yearly Grid Cost</div><div class="value" style="font-size:22px">₹${n(yearlyBillAfter)}</div></div>
        <div class="card"><div class="label">Payback Clock</div><div class="value" style="font-size:22px">${result.paybackDisplay}</div></div>
      </div>
      `
    ),
    slide(
      9,
      "Payback Timeline",
      `
      <div class="kpi">${result.paybackDisplay}</div>
      <div class="small">Cumulative savings vs net investment (estimated)</div>
      <div class="pills">
        <span class="pill">Net Cost: ₹${n(result.netCost)}</span>
        <span class="pill">Annual Saving: ₹${n(result.annualSavings)}</span>
      </div>
      <div class="chart-wrap"><canvas id="chart-slide-9" width="800" height="280"></canvas></div>
      `
    ),
    slide(
      10,
      "25 Year Profit",
      `
      <div class="jackpot-wrap">
        <div class="jackpot-glow"></div>
        <div class="jackpot-card">₹${n(result.profit25yr)} NET PROFIT</div>
      </div>
      <div class="grid" style="margin-top:14px">
        <div class="card"><div class="label">Total Savings (25Y)</div><div class="value">₹${n(result.savings25yr)}</div></div>
        <div class="card"><div class="label">Annual Savings</div><div class="value">₹${n(result.annualSavings)}</div></div>
        <div class="card"><div class="label">Payback</div><div class="value">${result.paybackDisplay}</div></div>
        <div class="card"><div class="label">25Y Generation</div><div class="value">${n(result.annualGeneration * 25)}</div></div>
      </div>
      `
    ),
    slide(
      11,
      "Tariff Risk vs Solar Stability",
      `
      <div class="small">Grid tariff generally trends upward. Solar offsets future tariff shocks.</div>
      <div class="grid">
        <div class="card"><div class="label">Without Solar</div><div class="value">Higher bill risk</div></div>
        <div class="card"><div class="label">With Solar</div><div class="value">Lower bill pressure</div></div>
      </div>
      `
    ),
    slide(
      12,
      "Environmental Impact",
      `
      <div class="grid">
        <div class="card"><div class="label">Clean Units / Year</div><div class="value">${n(result.annualGeneration)}</div></div>
        <div class="card"><div class="label">25Y Clean Output</div><div class="value">${n(result.annualGeneration * 25)}</div></div>
      </div>
      <div class="small" style="margin-top:10px">A cleaner, future-ready energy footprint for your property.</div>
      `
    ),
    slide(
      13,
      "System Components & Warranty",
      `
      <div class="pills">
        <span class="pill">Tier-1 Solar Panels</span>
        <span class="pill">On-grid Inverter</span>
        <span class="pill">Protection + Earthing</span>
        <span class="pill">Net Meter Ready</span>
      </div>
      <div class="small" style="margin-top:12px">Standard product/performance warranties apply as per final BOM.</div>
      `
    ),
    slide(
      14,
      "Installation Plan",
      `
      <div class="grid">
        <div class="card"><div class="label">Step 1</div><div class="value">Site Survey</div></div>
        <div class="card"><div class="label">Step 2</div><div class="value">Design Freeze</div></div>
        <div class="card"><div class="label">Step 3</div><div class="value">Installation</div></div>
        <div class="card"><div class="label">Step 4</div><div class="value">Net Metering</div></div>
      </div>
      `
    ),
    slide(
      15,
      "Why Choose Us",
      `
      <div class="hero" style="font-size:30px">Thank You, ${customerName}</div>
      <div class="small">Trusted execution, transparent costing, and long-term support.</div>
      <div class="pills" style="margin-top:14px">
        <span class="pill">Phone: ${escHtml(installerContact)}</span>
        <span class="pill">Date: ${today}</span>
      </div>
      <div style="margin-top:14px" class="small">Download professional PDF from ${APP_DISPLAY_NAME} for sharing.</div>
      `
    )
  ];

  const chartLabelsJson = JSON.stringify(CHART_MONTH_LABELS);
  const chartValuesJson = JSON.stringify(unitBars);
  const payLabelsJson = JSON.stringify(payLabelsArr);
  const savingsLineJson = JSON.stringify(savingsLine);
  const netLineJson = JSON.stringify(netLine);
  const cssVars =
    themePreset === "greenBlueVivid"
      ? "--ss-navy:#0D2C54;--ss-emerald:#00A88F;--ss-gold:#FFB81C;--ss-bg:#edf3f8;"
      : "--ss-navy:#0D2C54;--ss-emerald:#00A88F;--ss-gold:#FFB81C;--ss-bg:#f2f6fb;";
  const chartGreen = "#00A88F";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solar Proposal - ${customerName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    :root {
      ${cssVars}
      --ss-space-1: 8px;
      --ss-space-2: 12px;
      --ss-space-3: 16px;
      --ss-space-4: 24px;
      --ss-text-xs: 10px;
      --ss-text-sm: 13px;
      --ss-text-md: 17px;
      --ss-text-lg: 26px;
      --ss-text-xl: 36px;
    }
    body { margin: 0; font-family: "Montserrat", Inter, Arial, sans-serif; background: var(--ss-bg); color: var(--ss-navy); }
    .wrap { max-width: 900px; margin: 24px auto; display: grid; gap: 14px; }
    .slide { background: #fff; border-radius: 16px; border: 1px solid #d8e4f3; min-height: 520px; padding: var(--ss-space-4); position: relative; overflow: hidden; }
    .slide::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 86px; background: linear-gradient(180deg, rgba(13,44,84,0.03) 0%, rgba(13,44,84,0) 100%); pointer-events: none; }
    .slide > *:not(.prop-header):not(.footer) { position: relative; z-index: 1; }
    .prop-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; border-bottom: 1px solid #e6edf5; padding-bottom: 10px; margin-bottom: var(--ss-space-3); }
    .prop-brand-big { justify-self: start; min-height: 52px; display: flex; align-items: center; }
    .installer-logo { max-height: 56px; max-width: 220px; width: auto; object-fit: contain; }
    .installer-logo-balanced { max-height: 42px; max-width: 180px; width: auto; object-fit: contain; opacity: 0.95; }
    .installer-nameplate { font-size: 22px; font-weight: 900; color: #0b3c5d; letter-spacing: -0.02em; }
    .installer-nameplate-balanced { font-size: 18px; font-weight: 800; color: #345b79; letter-spacing: -0.01em; }
    .prop-slide-title { font-size: var(--ss-text-xs); font-weight: 800; letter-spacing: .12em; color: var(--ss-navy); text-transform: uppercase; text-align: center; }
    .prop-ss-mini { justify-self: end; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .prop-pb { font-size: 9px; font-weight: 600; color: #7a8fa3; text-transform: uppercase; }
    .prop-ss-img { height: 20px; width: auto; opacity: 0.85; }
    .prop-ss-balanced { justify-self: end; display: flex; align-items: center; gap: 6px; }
    .prop-ss-img-balanced { height: 22px; width: auto; opacity: 0.95; }
    .chart-wrap { margin-top: var(--ss-space-2); max-width: 100%; height: 260px; position: relative; }
    .slide:nth-of-type(9) .chart-wrap { height: 280px; }
    .hero { font-size: clamp(30px, 4.6vw, 40px); font-weight: 900; color: var(--ss-emerald); margin: var(--ss-space-1) 0; line-height: 1.05; letter-spacing: -0.01em; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ss-space-2); margin-top: var(--ss-space-2); }
    .card { border: 1px solid #dce8f6; border-radius: 12px; padding: 14px; background: #f7fbff; box-shadow: 0 8px 20px rgba(13,44,84,0.04); }
    .label { font-size: var(--ss-text-xs); font-weight: 700; text-transform: uppercase; color: #5d738d; letter-spacing: .08em; }
    .value { font-size: clamp(21px, 3.6vw, 28px); font-weight: 900; color: var(--ss-navy); margin-top: 6px; line-height: 1.08; }
    .footer { position: absolute; left: 24px; right: 24px; bottom: 16px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; font-size: var(--ss-text-xs); color: #607488; }
    .footer-left { justify-self: start; display: flex; align-items: center; }
    .footer-center { justify-self: center; font-weight: 700; letter-spacing: .02em; }
    .footer-right { justify-self: end; display: flex; align-items: center; }
    .footer-installer-logo { max-height: 18px; width: auto; object-fit: contain; }
    .footer-installer-name { font-size: 10px; font-weight: 800; color: var(--ss-navy); }
    .footer-sol-logo { max-height: 16px; width: auto; opacity: .85; }
    .kpi { font-size: clamp(38px, 5.4vw, 54px); font-weight: 900; color: var(--ss-emerald); line-height: 1; letter-spacing: -0.015em; }
    .small { font-size: var(--ss-text-sm); color: #4b627a; line-height: 1.45; }
    .pills { display: flex; flex-wrap: wrap; gap: var(--ss-space-1); margin-top: var(--ss-space-2); }
    .pill { background: #e9f4ff; color: var(--ss-navy); border-radius: 999px; padding: 5px 11px; font-size: 11px; font-weight: 700; }
    .hero-cover { position: relative; border-radius: 18px; overflow: hidden; min-height: 250px; margin-bottom: 16px; border: 1px solid rgba(13,44,84,0.12); }
    .hero-cover-bg { position: absolute; inset: 0; background-image: linear-gradient(135deg, rgba(13,44,84,0.72), rgba(0,168,143,0.52)), url('/sol52-night-hero.svg'); background-size: cover; background-position: center; filter: blur(2px) saturate(1.05); transform: scale(1.04); }
    .hero-cover-card { position: relative; z-index: 1; max-width: 520px; margin: 44px auto 0; background: rgba(255,255,255,0.92); border-radius: 16px; border: 1px solid rgba(255,255,255,0.9); padding: 20px 24px; text-align: center; box-shadow: 0 20px 40px rgba(13,44,84,0.24); }
    .hero-cover-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .13em; color: var(--ss-emerald); }
    .hero-cover-title { margin-top: 8px; font-size: 30px; line-height: 1.12; font-weight: 900; color: var(--ss-navy); }
    .hero-cover-sub { margin-top: 8px; font-size: 12px; font-weight: 700; color: #4b627a; }
    .hero-metric-circles { display: flex; justify-content: center; gap: 16px; margin-top: 12px; }
    .hero-metric-circle { width: 148px; height: 148px; border-radius: 999px; background: radial-gradient(circle at 30% 20%, #ffffff 0%, #e8faf6 52%, #d4f4ec 100%); border: 2px solid rgba(0,168,143,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: inset 0 0 0 1px rgba(0,168,143,0.14); }
    .hero-metric-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #597089; }
    .hero-metric-value { font-size: 25px; margin-top: 6px; font-weight: 900; color: var(--ss-navy); }
    .cover-layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; align-items: stretch; }
    .cover-layout .hero-cover { margin-bottom: 0; min-height: 260px; }
    .cover-analytics { border: 1px solid #dce8f6; border-radius: 16px; background: #f7fbff; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .cover-kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .cover-kpi-grid .card { margin: 0; padding: 10px; min-height: 82px; }
    .cover-inline-metrics { display: flex; flex-wrap: wrap; gap: 6px; }
    .cover-details-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .cover-detail { border: 1px solid #dce8f6; border-radius: 10px; background: #fbfdff; padding: 8px 10px; min-height: 70px; }
    .cover-detail span { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #5d738d; }
    .cover-detail strong { display: block; margin-top: 5px; font-size: 13px; line-height: 1.35; color: #0d2c54; word-break: break-word; }
    .cover-detail-wide { grid-column: span 3; }
    .villain-slide { margin-top: 6px; border-radius: 16px; background: #0D2C54; padding: 24px; min-height: 360px; }
    .villain-title { color: #fff; text-align: center; font-size: 38px; line-height: 1.05; font-weight: 900; letter-spacing: .06em; margin-bottom: 28px; }
    .villain-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items: center; }
    .villain-card { border-radius: 14px; background: rgba(255,255,255,0.08); padding: 18px 16px; min-height: 170px; display: flex; flex-direction: column; justify-content: center; }
    .villain-card-danger { border: 2px solid #ef4444; box-shadow: 0 0 0 1px rgba(239,68,68,0.22); }
    .villain-card-success { border: 2px solid #22c55e; box-shadow: 0 0 0 1px rgba(34,197,94,0.22); }
    .villain-label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #d6e1ef; font-weight: 800; }
    .villain-value { margin-top: 10px; font-size: 34px; font-weight: 900; color: #fff; line-height: 1.05; }
    .villain-arrow { font-size: 26px; font-weight: 900; color: #FFB81C; letter-spacing: .04em; padding: 14px 16px; border-radius: 999px; border: 2px solid rgba(255,184,28,0.45); background: rgba(255,184,28,0.09); }
    .jackpot-wrap { position: relative; margin-top: 36px; }
    .jackpot-glow { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); width: 420px; height: 170px; background: radial-gradient(circle at center, rgba(0,168,143,0.28) 0%, rgba(0,168,143,0.09) 58%, rgba(0,168,143,0) 100%); }
    .jackpot-card { position: relative; z-index: 1; margin: 0 auto; max-width: 560px; border-radius: 22px; text-align: center; font-size: 52px; line-height: 1.05; font-weight: 900; color: #fff; padding: 34px 24px; letter-spacing: .01em; background: linear-gradient(135deg, #00A88F 0%, #008f7a 100%); box-shadow: 0 24px 42px rgba(0,168,143,0.28); }
    @media (max-width: 860px) {
      .wrap { margin: 10px auto; max-width: 100%; padding: 0 8px; }
      .slide { padding: 16px; min-height: 420px; }
      .prop-header { grid-template-columns: 1fr; gap: 6px; text-align: center; }
      .prop-brand-big,.prop-ss-mini,.prop-ss-balanced { justify-self: center; }
      .grid { grid-template-columns: 1fr; gap: 8px; }
      .cover-layout { grid-template-columns: 1fr; }
      .cover-kpi-grid { grid-template-columns: 1fr 1fr; }
      .cover-details-grid { grid-template-columns: 1fr 1fr; }
      .cover-detail-wide { grid-column: span 2; }
      .hero-cover-card { margin-top: 28px; padding: 14px; }
      .hero-cover-title { font-size: 24px; }
      .kpi { font-size: 34px; }
      .villain-grid { grid-template-columns: 1fr; }
      .villain-arrow { text-align: center; }
      .jackpot-card { font-size: 34px; padding: 20px 16px; }
      .footer { position: static; margin-top: 12px; grid-template-columns: 1fr; text-align: center; }
      .footer-left,.footer-center,.footer-right { justify-self: center; }
    }
    @media print {
      .wrap { margin: 0; }
      .slide { page-break-after: always; border: none; border-radius: 0; min-height: 96vh; }
    }
  </style>
</head>
<body>
  <div class="wrap">${slides.join("")}</div>
  <script>
  document.addEventListener("DOMContentLoaded", function () {
    if (typeof Chart === "undefined") return;
    var el2 = document.getElementById("chart-slide-2");
    if (el2) {
      var ctx2 = el2.getContext("2d");
      var grad2 = ctx2 ? ctx2.createLinearGradient(0, 0, 0, 260) : null;
      if (grad2) {
        grad2.addColorStop(0, "#17BEBB");
        grad2.addColorStop(1, "#00A88F");
      }
      new Chart(el2, {
        type: "bar",
        data: {
          labels: ${chartLabelsJson},
          datasets: [{
            label: "Units (kWh)",
            data: ${chartValuesJson},
            backgroundColor: grad2 || "#00A88F",
            borderRadius: 999,
            borderSkipped: false,
            maxBarThickness: 34
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: true, text: "Monthly units — bijli problem" } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
    var el9 = document.getElementById("chart-slide-9");
    if (el9) {
      new Chart(el9, {
        type: "line",
        data: {
          labels: ${payLabelsJson},
          datasets: [
            {
              label: "Cumulative savings (₹)",
              data: ${savingsLineJson},
              borderColor: "${chartGreen}",
              backgroundColor: "rgba(0,168,143,0.12)",
              fill: true,
              tension: 0.15,
              pointRadius: 3,
              pointBackgroundColor: "#00A88F"
            },
            {
              label: "Net investment (₹)",
              data: ${netLineJson},
              borderColor: "#c0392b",
              borderDash: [6, 4],
              fill: false,
              tension: 0,
              pointRadius: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: "Payback — savings cross net cost" } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  });
  </script>
</body>
</html>`;
}
