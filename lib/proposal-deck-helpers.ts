/**
 * Sol.52 — Reusable helpers for building the 4-slide premium proposal deck
 * AND the public `/proposal/[id]` web view. Pure functions; no I/O.
 *
 * Design principle: numbers shown to the customer must be derivable from
 * the FY 2025-26 MP engine outputs. We do not invent values. If the user
 * supplies a hint (e.g. brand, panel count) we use it, otherwise we pick
 * a sensible default based on system size.
 */

export type DeckBrand = "Adani" | "Waaree" | "JSW" | "Tata" | "Vikram" | "RenewSys";

export type DeckBomItem = {
  slot: number;
  title: string;
  spec: string;
  brand: string;
  warranty: string;
};

export type DeckEnvironmentalImpact = {
  annualGenUnits: number;
  annualCo2KgSaved: number;
  lifetimeCo2TonsSaved: number;
  treeEquivalent: number;
};

export type DeckSolarVsGrid = {
  years: number[];
  gridCumulative: number[];
  solarCumulative: number[];
  totalGrid: number;
  totalSolar: number;
  netSaving: number;
};

const HINDI_HONORIFIC_BLOCKLIST = new Set(["customer", "client", "user", "owner", "n/a", "na"]);

/**
 * Append the Hindi honorific "जी" to a customer name unless:
 *   • the name is generic / placeholder
 *   • the name already ends with जी / sahab / ji
 *   • the name is a corporate/business name (contains LLP, Pvt, Ltd, etc.)
 */
export function withHonorific(rawName: string | null | undefined): string {
  const name = (rawName ?? "").trim();
  if (!name) return "Customer";
  const lower = name.toLowerCase();
  if (HINDI_HONORIFIC_BLOCKLIST.has(lower)) return name;
  if (/(^|\s)(ji|जी|sahab|sahib|sir|madam|mam|mr|mrs|miss|dr|prof)\b/i.test(name)) return name;
  if (/(pvt|ltd|llp|inc|corp|co\.|company|enterprises?|trust|society|udyog|industries|traders|hospital|hotel)\b/i.test(name)) {
    return name;
  }
  return `${name} जी`;
}

/**
 * Default panel/inverter/structure brands by system size & customer preference.
 */
export function pickBrandSet(opts: {
  preferredPanelBrand?: DeckBrand;
  systemKw: number;
}): { panel: DeckBrand; inverter: string; mounting: string; cables: string } {
  const panel: DeckBrand = opts.preferredPanelBrand ?? (opts.systemKw <= 3 ? "Adani" : opts.systemKw <= 7 ? "Waaree" : "JSW");
  return {
    panel,
    inverter: "Growatt / Deye (BIS-certified)",
    mounting: "JSW Hot-Dip Galvanized",
    cables: "Polycab / RR Kabel"
  };
}

/**
 * Standard residential/commercial BOM derived from the chosen system size.
 * Quantities scale with kW; brand strings reflect Indian market leaders.
 */
export function buildBom(opts: {
  systemKw: number;
  preferredPanelBrand?: DeckBrand;
}): DeckBomItem[] {
  const kw = Math.max(1, Math.round(opts.systemKw || 1));
  const panelWatt = 540;
  const panelCount = Math.max(1, Math.ceil((kw * 1000) / panelWatt));
  const brands = pickBrandSet({ preferredPanelBrand: opts.preferredPanelBrand, systemKw: kw });
  return [
    {
      slot: 1,
      title: "Solar Panels",
      spec: `${panelCount} × ${panelWatt} Wp Mono PERC / TOPCon (BIS, MNRE)`,
      brand: brands.panel,
      warranty: "25 yr performance"
    },
    {
      slot: 2,
      title: "Solar Inverter",
      spec: `${kw} kW On-Grid String Inverter (MPPT, IP65)`,
      brand: brands.inverter,
      warranty: "10 yr"
    },
    {
      slot: 3,
      title: "Mounting Structure",
      spec: "Hot-Dip Galvanized GI, wind-load 150 km/h rated",
      brand: brands.mounting,
      warranty: "25 yr rust-proof"
    },
    {
      slot: 4,
      title: "DC + AC Cabling",
      spec: "TUV-approved 4 mm² DC + 4 mm² AC, fire-resistant",
      brand: brands.cables,
      warranty: "Lifetime"
    },
    {
      slot: 5,
      title: "Protection & Safety",
      spec: "DCDB + ACDB with SPD, MCB/MCCB, copper earthing",
      brand: "Havells / Phoenix",
      warranty: "5 yr"
    },
    {
      slot: 6,
      title: "Net Metering & AMC",
      spec: "DISCOM application, commissioning, 5-yr free AMC",
      brand: "Harihar Solar Service Desk",
      warranty: "5 yr free"
    }
  ];
}

/**
 * Solar generation estimate using India avg insolation (4 sun-hours/day,
 * 75% performance ratio). Returns annual units rounded.
 */
export function estimateAnnualGenerationUnits(systemKw: number): number {
  const kw = Math.max(0, Number(systemKw) || 0);
  const dailyUnits = kw * 4 * 0.75 * 1.05; // PR adj + India 5.0 kWh/m²/day mid
  return Math.round(dailyUnits * 365);
}

/**
 * Environmental impact derived from annual generation.
 *  • CO₂ factor: 0.82 kg / kWh (India grid avg, CEA 2023).
 *  • Tree equivalence: 22 kg CO₂ absorbed / tree / year.
 */
export function computeEnvironmentalImpact(systemKw: number, lifetimeYears = 25): DeckEnvironmentalImpact {
  const annualGenUnits = estimateAnnualGenerationUnits(systemKw);
  const annualCo2KgSaved = Math.round(annualGenUnits * 0.82);
  const lifetimeCo2TonsSaved = Math.round((annualCo2KgSaved * lifetimeYears) / 1000);
  const treeEquivalent = Math.round((annualCo2KgSaved * lifetimeYears) / 22);
  return { annualGenUnits, annualCo2KgSaved, lifetimeCo2TonsSaved, treeEquivalent };
}

/**
 * 25-year cumulative cost: grid escalates ~5%/yr; solar is one-time + AMC.
 * Returns arrays at 5-year intervals (5, 10, 15, 20, 25) for the line chart.
 */
export function computeSolarVsGrid(opts: {
  yearlyBill: number;
  netCostInr: number;
  yearlyAmcInr?: number;
  escalationPct?: number;
  horizonYears?: number;
}): DeckSolarVsGrid {
  const escalation = opts.escalationPct ?? 5;
  const horizon = opts.horizonYears ?? 25;
  const yearlyAmc = opts.yearlyAmcInr ?? Math.round(opts.netCostInr * 0.005);
  const years: number[] = [];
  const gridCumulative: number[] = [];
  const solarCumulative: number[] = [];
  let gridSum = 0;
  let solarSum = opts.netCostInr;
  for (let y = 1; y <= horizon; y += 1) {
    gridSum += Math.round(opts.yearlyBill * Math.pow(1 + escalation / 100, y - 1));
    solarSum += yearlyAmc;
    if (y % 5 === 0 || y === 1) {
      years.push(y);
      gridCumulative.push(gridSum);
      solarCumulative.push(solarSum);
    }
  }
  return {
    years,
    gridCumulative,
    solarCumulative,
    totalGrid: gridSum,
    totalSolar: solarSum,
    netSaving: gridSum - solarSum
  };
}

/**
 * Best-effort net-post-subsidy cost. PM Surya Ghar 2024 caps:
 *   1 kW → 30,000 ; 2 kW → 60,000 ; 3 kW+ → 78,000 (max).
 */
export function computePmSuryaGharSubsidy(systemKw: number): number {
  const kw = Math.max(0, Math.round(systemKw || 0));
  if (kw <= 0) return 0;
  if (kw === 1) return 30000;
  if (kw === 2) return 60000;
  return 78000;
}

/**
 * Honest payback: the value supplied if positive & finite, else recompute.
 */
export function honestPaybackYears(opts: {
  paybackHint?: number;
  netCostInr: number;
  annualSavingInr: number;
}): number {
  const hint = Number(opts.paybackHint);
  if (Number.isFinite(hint) && hint > 0 && hint < 99) return Math.round(hint * 10) / 10;
  if (opts.annualSavingInr <= 0) return 99;
  return Math.round((opts.netCostInr / opts.annualSavingInr) * 10) / 10;
}

// ---------------------------------------------------------------------------
// EMI calculator — standard reducing-balance formula.
// ---------------------------------------------------------------------------

export type EmiRow = {
  tenureYears: number;
  monthlyEmi: number;
  totalInterest: number;
  totalPayable: number;
};

/**
 * Reducing-balance EMI:
 *   EMI = P * r * (1+r)^n / ((1+r)^n − 1)
 * Where r = annualRate/12/100 and n = tenureYears * 12.
 */
export function computeEmi(principalInr: number, annualRatePct: number, tenureYears: number): EmiRow {
  const P = Math.max(0, Number(principalInr) || 0);
  const r = Math.max(0, Number(annualRatePct) || 0) / 12 / 100;
  const n = Math.max(1, Math.round(Number(tenureYears) || 0) * 12);
  if (P <= 0 || n <= 0) {
    return { tenureYears, monthlyEmi: 0, totalInterest: 0, totalPayable: 0 };
  }
  if (r === 0) {
    const emi = P / n;
    return { tenureYears, monthlyEmi: Math.round(emi), totalInterest: 0, totalPayable: P };
  }
  const factor = Math.pow(1 + r, n);
  const emi = (P * r * factor) / (factor - 1);
  const totalPayable = emi * n;
  return {
    tenureYears,
    monthlyEmi: Math.round(emi),
    totalInterest: Math.round(totalPayable - P),
    totalPayable: Math.round(totalPayable)
  };
}

export function buildEmiTable(
  principalInr: number,
  annualRatePct: number,
  tenuresYears: number[] = [3, 5, 7]
): EmiRow[] {
  return tenuresYears.map((y) => computeEmi(principalInr, annualRatePct, y));
}

// ---------------------------------------------------------------------------
// Payment terms — 25 / 50 / 20 / 5 default.
// ---------------------------------------------------------------------------

export type PaymentMilestone = {
  step: number;
  pct: number;
  label: string;
  amountInr: number;
};

export const DEFAULT_PAYMENT_TERMS = [
  { step: 1, pct: 25, key: "advance" as const },
  { step: 2, pct: 50, key: "material" as const },
  { step: 3, pct: 20, key: "installation" as const },
  { step: 4, pct: 5, key: "commissioning" as const }
];

export function buildPaymentMilestones(grossInr: number): PaymentMilestone[] {
  const total = Math.max(0, Number(grossInr) || 0);
  return DEFAULT_PAYMENT_TERMS.map((p) => ({
    step: p.step,
    pct: p.pct,
    label: p.key,
    amountInr: Math.round((total * p.pct) / 100)
  }));
}

// ---------------------------------------------------------------------------
// AMC options — 1 / 5 / 10 year plans.
// ---------------------------------------------------------------------------

export type AmcOption = {
  years: 1 | 5 | 10;
  /** % of gross system cost per year. */
  yearlyPct: number;
  totalInr: number;
  free: boolean;
  highlights: string[];
};

export function buildAmcOptions(grossInr: number, lang: "en" | "hi" = "en"): AmcOption[] {
  const G = Math.max(0, Number(grossInr) || 0);
  const en = lang === "en";
  return [
    {
      years: 1,
      yearlyPct: 0,
      totalInr: 0,
      free: true,
      highlights: en
        ? ["Free AMC included with installation", "Quarterly visit", "WhatsApp support 9 AM – 8 PM"]
        : ["स्थापना के साथ निःशुल्क AMC", "त्रैमासिक दौरा", "WhatsApp सपोर्ट 9 AM – 8 PM"]
    },
    {
      years: 5,
      yearlyPct: 1.5,
      totalInr: Math.round((G * 1.5 * 5) / 100),
      free: false,
      highlights: en
        ? ["Quarterly cleaning + electrical check", "48-hr breakdown response", "Annual generation report"]
        : ["त्रैमासिक सफाई + विद्युत जांच", "48 घंटे में ब्रेकडाउन रिस्पॉन्स", "वार्षिक उत्पादन रिपोर्ट"]
    },
    {
      years: 10,
      yearlyPct: 1.2,
      totalInr: Math.round((G * 1.2 * 10) / 100),
      free: false,
      highlights: en
        ? ["Monthly cleaning visit", "24-hr breakdown response", "Inverter swap if failure", "Quarterly performance review"]
        : ["मासिक सफाई का दौरा", "24 घंटे में ब्रेकडाउन रिस्पॉन्स", "विफलता पर इन्वर्टर बदलाव", "त्रैमासिक प्रदर्शन समीक्षा"]
    }
  ];
}

// ---------------------------------------------------------------------------
// Company profile — Harihar Solar default; override-friendly.
// ---------------------------------------------------------------------------

export type CompanyProfile = {
  aboutUsParagraphs: string[];
  founded: string;
  gstNumber: string;
  locations: string;
  installationsDone: string;
  installationsLabel: string;
  bullets: string[];
};

export function defaultCompanyProfile(lang: "en" | "hi" = "en"): CompanyProfile {
  if (lang === "hi") {
    return {
      aboutUsParagraphs: [
        "हरिहर सोलर मध्य प्रदेश के सतना ज़िले की एक स्थानीय रूफटॉप सोलर EPC कंपनी है। 2020 से हम 100% स्थानीय टीम के साथ घरों, दुकानों और छोटे उद्योगों के लिए ग्रिड-कनेक्टेड सोलर स्थापित कर रहे हैं।",
        "हम भारत में निर्मित Tier-1 मॉड्यूल (Adani / Waaree), BIS-प्रमाणित ऑन-ग्रिड इनवर्टर और गैल्वनाइज्ड माउंटिंग का ही उपयोग करते हैं — कोई हरकत नहीं।"
      ],
      founded: "2020",
      gstNumber: "23AFRFS3815B1Z4",
      locations: "सतना · रीवा · जबलपुर · कटनी",
      installationsDone: "200+",
      installationsLabel: "सिस्टम स्थापित",
      bullets: [
        "100% स्थानीय टीम — हमेशा 24/7 उपलब्ध",
        "PM सूर्य घर सब्सिडी कागज़ी कार्य निःशुल्क",
        "नेट मीटरिंग आवेदन हम करेंगे",
        "5 वर्ष की निःशुल्क AMC"
      ]
    };
  }
  return {
    aboutUsParagraphs: [
      "Harihar Solar is a Satna-based rooftop solar EPC company serving Madhya Pradesh since 2020. Our 100% local team installs grid-connected solar for homes, shops and small industries.",
      "We use only Indian-made Tier-1 modules (Adani / Waaree), BIS-certified on-grid inverters and galvanized mounting — no shortcuts."
    ],
    founded: "2020",
    gstNumber: "23AFRFS3815B1Z4",
    locations: "Satna · Rewa · Jabalpur · Katni",
    installationsDone: "200+",
    installationsLabel: "Systems installed",
    bullets: [
      "100% local team — 24/7 availability",
      "PM Surya Ghar subsidy paperwork — FREE",
      "We file the net-meter application",
      "5-year free AMC included"
    ]
  };
}

// ---------------------------------------------------------------------------
// UPI deep-link string — used by the QR generator.
// ---------------------------------------------------------------------------

export function buildUpiDeepLink(opts: {
  upiId: string;
  payeeName: string;
  amountInr?: number | null;
  note?: string;
}): string {
  const params = new URLSearchParams();
  params.set("pa", opts.upiId.trim());
  params.set("pn", opts.payeeName.trim());
  if (opts.amountInr && opts.amountInr > 0) params.set("am", String(Math.round(opts.amountInr)));
  params.set("cu", "INR");
  if (opts.note) params.set("tn", opts.note.slice(0, 50));
  return `upi://pay?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Customer profile — defaults for the cover slide.
// ---------------------------------------------------------------------------

export type CustomerProfile = {
  consumerId?: string;
  meterNumber?: string;
  connectionDate?: string;
  connectionType?: string;
  phase?: string;
  sanctionedLoadKw?: number;
};

export function profileFieldOrDash(value: string | number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}
