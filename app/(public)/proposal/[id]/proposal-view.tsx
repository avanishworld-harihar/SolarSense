"use client";

import { MotionConfig, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  Compass,
  Download,
  ChevronsLeftRight,
  Factory,
  Gauge,
  Hammer,
  Home,
  Languages,
  Leaf,
  MessageCircle,
  Moon,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  Sun,
  TreeDeciduous,
  XCircle,
  Zap
} from "lucide-react";
import type { ProposalDeckSummary } from "@/lib/proposal-ppt";
import { PROPOSAL_BRANDING_UPDATED_EVENT, readProposalBrandingSettings } from "@/lib/proposal-branding-settings";
import {
  applyProposalRouteShellTheme,
  readProposalWebTheme,
  writeProposalWebTheme
} from "@/lib/proposal-web-theme";
import { dict, monthLabels, type ProposalDict, type ProposalLang } from "@/lib/proposal-i18n";
import { ATAL_GRIHA_JYOTI } from "@/lib/mp-tariff-2025-26";
import { profileFieldOrDash, type EmiRow } from "@/lib/proposal-deck-helpers";
import { hindiHonoredDisplayName } from "@/lib/roman-name-to-devanagari";
import { resolvedCompanyProfileForLang } from "@/lib/proposal-company-resolve";
import { PROPOSAL_PLATFORM_CREDIT } from "@/lib/platform-branding";
import {
  DEFAULT_EXPERTISE_CARD_IMAGES,
  expertiseCategoriesCopy,
  solutionsForEveryScale,
  whyCustomersChooseUsTitle
} from "@/lib/proposal-about-expertise";
import {
  HeroSavingsRibbon,
  JourneyBridge,
  ProposalJourneyProgress,
  ProposalJourneySection,
  ProposalPanel,
  ProposalSectionHeader
} from "@/components/proposal/proposal-journey";

// ---------------------------------------------------------------------------
// Connection-type expansion — gives "LT" → "LT — Low Tension (Residential)"
// so the customer profile never reads as a bare two-letter code.
// ---------------------------------------------------------------------------
function expandConnectionType(raw: string | undefined | null, lang: ProposalLang = "en"): string {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  const upper = v.toUpperCase();
  const hi = lang === "hi";
  if (/domestic/i.test(v) && /lv\s*[-]?\s*1\s*\.?\s*2/i.test(v)) {
    return hi
      ? "घरेलू — LV1.2 (मीटर, सिंगल फेज़ सामान्य)"
      : "Domestic — LV1.2 (metered, single-phase typical)";
  }
  if (/\bdomestic\b/i.test(v) && /light\s*and\s*fan/i.test(v)) {
    return hi ? "घरेलू — लाइट और पंखा (आवासीय)" : "Domestic — light & fan (residential)";
  }
  if (upper === "LT") return hi ? "LT — लो टेंशन (आवासीय)" : "LT — Low Tension (Residential)";
  if (upper === "HT") return hi ? "HT — हाई टेंशन (औद्योगिक)" : "HT — High Tension (Industrial)";
  if (upper === "EHT" || upper === "EHV") return hi ? "EHT — अति उच्च टेंशन" : "EHT — Extra High Tension";
  if (upper === "DS-I" || upper === "DS1") return hi ? "DS-I — घरेलू स्लैब I" : "DS-I — Domestic Slab I";
  if (upper === "DS-II" || upper === "DS2") return hi ? "DS-II — घरेलू स्लैब II" : "DS-II — Domestic Slab II";
  if (upper === "BPL") return hi ? "BPL — गरीबी रेखा से नीचे" : "BPL — Below Poverty Line";
  if (/^lt\b/i.test(v)) return hi ? v.replace(/^lt\b/i, "LT — लो टेंशन") : v.replace(/^lt\b/i, "LT — Low Tension");
  if (/^ht\b/i.test(v)) return hi ? v.replace(/^ht\b/i, "HT — हाई टेंशन") : v.replace(/^ht\b/i, "HT — High Tension");
  return v;
}

// Format a date-ish string nicely; gracefully fallback for empty / unknown.
function formatConnectionDate(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  // Already nicely formatted? leave it.
  if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(v)) return v.replace(/[/.]/g, "-");
  // Try a Date parse for ISO / locale strings
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  return v;
}

// ---------------------------------------------------------------------------
// Count-up animation hook
// ---------------------------------------------------------------------------
function normalizeCountTarget(target: number): number {
  return Math.max(0, Math.round(Number.isFinite(target) ? target : 0));
}

/** While count-up is at 0 (print / not yet in view), show the real metric instead of "0". */
function displayCountUp(counted: number, target: number): number {
  const t = normalizeCountTarget(target);
  if (t <= 0) return 0;
  return counted > 0 ? counted : t;
}

function useCountUp(target: number, inView: boolean, duration = 1.4) {
  const safeTarget = normalizeCountTarget(target);
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const snap = () => setValue(safeTarget);
    window.addEventListener("beforeprint", snap);
    const mq = window.matchMedia("print");
    const onPrintChange = () => {
      if (mq.matches) snap();
    };
    mq.addEventListener("change", onPrintChange);
    if (mq.matches) snap();
    return () => {
      window.removeEventListener("beforeprint", snap);
      mq.removeEventListener("change", onPrintChange);
    };
  }, [safeTarget]);

  useEffect(() => {
    if (reduced) {
      setValue(safeTarget);
      return;
    }
    if (!inView) return;
    let start: number | null = null;
    let raf = 0;
    setValue(0);
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * safeTarget));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, safeTarget, duration, reduced]);

  return value;
}

function AnimatedINR({ value, prefix = "₹", className }: { value: number; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const counted = useCountUp(value, inView);
  const shown = displayCountUp(counted, value);
  return (
    <span ref={ref} className={className}>
      {prefix}{shown.toLocaleString("en-IN")}
    </span>
  );
}

function AnimatedNumber({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const counted = useCountUp(value, inView);
  const shown = displayCountUp(counted, value);
  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString("en-IN")}{suffix}
    </span>
  );
}

function useMountAnimationReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return ready;
}

type ProposalViewProps = {
  id: string;
  customerName: string;
  generatedAt: string;
  summary: ProposalDeckSummary;
  installer: {
    name: string;
    contact: string;
    tagline: string;
  };
  /** Optional photo URLs for the About + Closing slides. */
  siteImages?: string[];
  /** Optional company logo URL. */
  installerLogoUrl?: string;
  /** When true, show the site survey + install workflow page (CRM `survey_status` complete). */
  showSurveyWorkflowSection?: boolean;
  /** When false, hide bill audit + economics pages and show system-requirement page instead. */
  billAuditBacked?: boolean;
};

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

/**
 * Net bill cell: subsidy in brackets on the same line (saves row height in print/PDF).
 * Format: (MP subsidy −₹550) ₹7,497
 */
function AuditNetBillCell({
  D,
  total,
  subsidy,
  isPeak,
  variant = "body"
}: {
  D: ProposalDict;
  total: number;
  subsidy?: number;
  isPeak?: boolean;
  variant?: "body" | "total";
}) {
  const s = Math.round(subsidy ?? 0);
  const hasSub = s < 0;
  const amtColor =
    variant === "total" ? "text-sky-950" : isPeak ? "text-rose-800" : "text-slate-900";
  const subColor =
    variant === "total" ? "text-rose-700" : isPeak ? "text-rose-700" : "text-rose-600";
  return (
    <span className="proposal-audit-net-bill inline-block max-w-full text-right leading-tight tabular-nums">
      {hasSub ? (
        <span className={`proposal-audit-net-bill-subsidy text-[11px] font-semibold sm:text-xs ${subColor}`}>
          ({D["audit.mpSubLabel"]} −₹{Math.abs(s).toLocaleString("en-IN")}){" "}
        </span>
      ) : null}
      <span
        className={`proposal-audit-net-bill-amount text-[15px] font-extrabold sm:text-sm md:text-base ${amtColor}`}
      >
        {inr(total)}
      </span>
    </span>
  );
}

const inrK = (v: number) => {
  const x = Math.max(0, Math.round(v));
  if (x >= 100000) return `₹${(x / 100000).toFixed(1)}L`;
  if (x >= 1000) return `₹${(x / 1000).toFixed(0)}k`;
  return `₹${x.toLocaleString("en-IN")}`;
};

/** `contact` may be `phone · email` — `tel:` must use the phone segment only. */
function telHrefFromInstallerContact(contact: string): string {
  const segment = contact.split("·")[0]?.trim() ?? contact.trim();
  const compact = segment.replace(/[^\d+]/g, "");
  if (compact.replace(/\+/g, "").length >= 8) return compact;
  return "+919993322267";
}

// ---------------------------------------------------------------------------
// Reusable atoms
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  rawValue,
  tone = "ink",
  delay = 0,
  dark = false,
  lang = "en"
}: {
  label: string;
  value: string;
  rawValue?: number;
  tone?: "ink" | "blue" | "green" | "rose";
  delay?: number;
  dark?: boolean;
  lang?: ProposalLang;
}) {
  const toneClass =
    tone === "blue" ? (dark ? "text-sky-300" : "text-sky-700") :
    tone === "green" ? (dark ? "text-emerald-300" : "text-emerald-700") :
    tone === "rose" ? (dark ? "text-rose-300" : "text-rose-700") :
    (dark ? "text-white" : "text-slate-900");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const counted = useCountUp(rawValue ?? 0, inView && rawValue !== undefined);
  const displayValue = rawValue !== undefined
    ? (value.startsWith("₹") ? `₹${counted.toLocaleString("en-IN")}` : counted.toLocaleString("en-IN") + value.replace(/^[\d,₹.]+/, ""))
    : value;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.21, 1.02, 0.73, 1] }}
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        dark
          ? "border-white/10 bg-white/5 backdrop-blur-sm"
          : "border-white/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      <p
        className={`text-[10px] font-semibold ${dark ? "text-slate-400" : "text-slate-500"} ${
          lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
        }`}
      >
        {label}
      </p>
      <p className={`mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl ${toneClass}`}>{displayValue}</p>
    </motion.div>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
  lang = "en",
  step
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  lang?: ProposalLang;
  step?: number;
}) {
  return <ProposalSectionHeader kicker={kicker} title={title} subtitle={subtitle} lang={lang} step={step} />;
}

function journeyBridge(lang: ProposalLang, key: string): string {
  const en: Record<string, string> = {
    afterCover: "We start with who we are — then we look at your bill, your savings, and your system.",
    afterTrust: "Your real electricity bills show where costs go up — and where solar helps.",
    afterBill: "From your bill pattern, here is how much you can save each year.",
    afterRequirement: "Here is the system we sized for your requirement — generation, coverage, and commercial snapshot.",
    afterSavings: "Along with savings, solar also cuts pollution and helps the planet.",
    afterImpact: "This is the system size and parts we recommend for your roof.",
    afterSystem: "Here is how we install, support, and stay with you after go-live.",
    afterInstall: "Clear yearly care so your panels keep working for decades.",
    afterSupport: "Payment steps, subsidy, and commercial terms — all in one place.",
    afterPay: "Bank details and a simple way to say yes — we are ready when you are."
  };
  const hi: Record<string, string> = {
    afterCover: "पहले हमारा परिचय — फिर आपका बिल, बचत और सिस्टम।",
    afterTrust: "आपके असली बिल बताते हैं कि खर्च कहाँ बढ़ता है — और सोलर कहाँ मदद करता है।",
    afterBill: "बिल के हिसाब से, हर साल आप कितना बचा सकते हैं — यहाँ है।",
    afterRequirement: "आपकी ज़रूरत के हिसाब से सिस्टम — उत्पादन, कवरेज और वाणिज्यिक सारांश।",
    afterSavings: "बचत के साथ, सोलर से प्रदूषण भी कम होता है।",
    afterImpact: "आपकी छत के लिए सिस्टम साइज़ और सामान — यहाँ है।",
    afterSystem: "इंस्टॉल, सपोर्ट और बाद की देखभाल — कैसे करते हैं।",
    afterInstall: "सालाना AMC — ताकि पैनल सालों तक चलें।",
    afterSupport: "भुगतान, सब्सिडी और शर्तें — सब एक जगह।",
    afterPay: "बैंक विवरण और अगला कदम — जब आप तैयार हों।"
  };
  return lang === "hi" ? hi[key] ?? en[key] ?? "" : en[key] ?? "";
}

function toFiniteNonNegative(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function MonthlyBillsChart({ values, labels, peakIndices }: { values: number[]; labels: string[]; peakIndices?: number[] }) {
  const safeValues = values.map((v) => toFiniteNonNegative(v));
  const max = Math.max(1, ...safeValues);
  const safeLabels = labels.length === safeValues.length
    ? labels
    : Array.from({ length: safeValues.length }, (_, i) => labels[i] ?? `M${i + 1}`);
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const animateReady = useMountAnimationReady();
  const peakSet = new Set(peakIndices ?? []);
  return (
    <motion.div
      ref={ref}
      className="proposal-audit-bars flex h-44 items-end gap-[2px] border-b-2 border-slate-300/90 sm:h-64 sm:gap-1 md:h-60 lg:h-72"
      role="img"
      aria-label="Monthly electricity bill bar chart"
    >
      {safeValues.map((v, i) => {
        const target = (v / max) * 100;
        const isPeak = peakSet.has(i);
        return (
          <div key={`${safeLabels[i]}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <motion.div
              // CSS var `--bar-target` is the print fallback — see globals.css.
              style={{ ["--bar-target" as string]: `${target}%`, minHeight: target > 0 ? 3 : 0 }}
              initial={reduced ? { height: `${target}%`, opacity: 1 } : { height: 0, opacity: 1 }}
              animate={animateReady ? { height: `${target}%`, opacity: 1 } : undefined}
              transition={{ type: "spring", delay: i * 0.018, stiffness: 120, damping: 20, mass: 0.9 }}
              className={`proposal-chart-bar w-full max-w-[2.25rem] sm:max-w-none ${
                isPeak ? "proposal-chart-bar--glass-peak" : "proposal-chart-bar--glass"
              }`}
              aria-label={`${safeLabels[i]}: ${v}`}
            />
            <span className="proposal-chart-label text-[10px] font-semibold text-slate-600 sm:text-[11px]">{safeLabels[i]}</span>
          </div>
        );
      })}
    </motion.div>
  );
}

function GenVsUseChart({
  labels,
  gen,
  use,
  legendGen,
  legendUse
}: {
  labels: string[];
  gen: number[];
  use: number[];
  legendGen: string;
  legendUse: string;
}) {
  const len = Math.min(labels.length, gen.length, use.length);
  const safeLabels = labels.slice(0, len);
  const safeGen = gen.slice(0, len).map((v) => toFiniteNonNegative(v));
  const safeUse = use.slice(0, len).map((v) => toFiniteNonNegative(v));
  const max = Math.max(1, ...safeGen, ...safeUse);
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const animateReady = useMountAnimationReady();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {legendGen}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sky-700">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> {legendUse}
        </span>
      </div>
      <div ref={ref} className="flex h-56 items-end gap-1 sm:h-72 lg:h-80">
        {safeLabels.map((label, i) => {
          const tg = (safeGen[i] / max) * 100;
          const tu = (safeUse[i] / max) * 100;
          return (
            <div key={`${label}-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="flex h-full w-full items-end gap-0.5">
                <motion.div
                  style={{ ["--bar-target" as string]: `${tg}%`, minHeight: tg > 0 ? 2 : 0 }}
                  initial={reduced ? { height: `${tg}%` } : { height: 0 }}
                  animate={animateReady ? { height: `${tg}%` } : undefined}
                  transition={{ type: "spring", delay: i * 0.018, stiffness: 116, damping: 20, mass: 0.9 }}
                  className="proposal-chart-bar flex-1 rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                />
                <motion.div
                  style={{ ["--bar-target" as string]: `${tu}%`, minHeight: tu > 0 ? 2 : 0 }}
                  initial={reduced ? { height: `${tu}%` } : { height: 0 }}
                  animate={animateReady ? { height: `${tu}%` } : undefined}
                  transition={{ type: "spring", delay: i * 0.018 + 0.02, stiffness: 116, damping: 20, mass: 0.9 }}
                  className="proposal-chart-bar flex-1 rounded-t-sm bg-gradient-to-t from-sky-600 to-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.4)]"
                />
              </div>
              <span className="text-[10px] font-medium text-slate-500">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SolarVsGridChart({
  years,
  grid,
  solar
}: {
  years: number[];
  grid: number[];
  solar: number[];
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduced = useReducedMotion();
  const maxY = Math.max(...grid, ...solar, 1);
  const W = 600;
  const H = 280;
  const pad = { l: 56, r: 12, t: 16, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const xs = years.map((_, i) => pad.l + (i / Math.max(1, years.length - 1)) * innerW);
  const ysGrid = grid.map((v) => pad.t + innerH - (v / maxY) * innerH);
  const ysSolar = solar.map((v) => pad.t + innerH - (v / maxY) * innerH);
  const lineGrid = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ysGrid[i].toFixed(1)}`).join(" ");
  const lineSolar = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ysSolar[i].toFixed(1)}`).join(" ");
  const axisTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-72 w-full sm:h-80">
      {axisTicks.map((t, i) => {
        const y = pad.t + innerH - t * innerH;
        const v = Math.round(maxY * t);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
            <text x={pad.l - 8} y={y + 4} fontSize={10} textAnchor="end" fill="#64748B">
              ₹{(v / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      {years.map((y, i) => (
        <text key={y} x={xs[i]} y={H - 8} fontSize={10} textAnchor="middle" fill="#64748B">
          {y}y
        </text>
      ))}
      <motion.path
        d={lineGrid}
        fill="none"
        stroke="#E11D48"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : undefined}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
      <motion.path
        d={lineSolar}
        fill="none"
        stroke="#0A6CF1"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : undefined}
        transition={{ duration: 1.4, delay: 0.25, ease: "easeInOut" }}
      />
      {ysGrid.map((y, i) => (
        <motion.circle
          key={`g${i}`}
          cx={xs[i]}
          cy={y}
          r={3.5}
          fill="#E11D48"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ delay: 1 + i * 0.06 }}
        />
      ))}
      {ysSolar.map((y, i) => (
        <motion.circle
          key={`s${i}`}
          cx={xs[i]}
          cy={y}
          r={3.5}
          fill="#0A6CF1"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ delay: 1.2 + i * 0.06 }}
        />
      ))}
    </svg>
  );
}

function CtaButton({
  href,
  onClick,
  children,
  variant = "primary",
  external = false
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all active:scale-95 sm:text-base";
  const styles = {
    primary: "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800",
    secondary: "border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100"
  } as const;
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={`${base} ${styles[variant]}`}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Slide-style sections — matching the 12 PPT slides.
// ---------------------------------------------------------------------------

function HeroCover({
  D,
  lang,
  summary,
  installerLogoUrl,
  location,
  siteImages,
  darkMode = false
}: {
  D: ProposalDict;
  lang: ProposalLang;
  summary: ProposalDeckSummary;
  installerLogoUrl?: string;
  location?: string;
  siteImages?: string[];
  darkMode?: boolean;
}) {
  const cp = summary.customerProfile;
  const cmp = resolvedCompanyProfileForLang(summary.companyProfile, lang);
  const heroBottomImage = siteImages?.[0];
  const displayName = lang === "hi" ? hindiHonoredDisplayName(summary.honoredName) : summary.honoredName;
  const taglineClass =
    lang === "hi"
      ? "truncate text-[11px] text-slate-500 sm:text-xs tracking-normal"
      : "truncate text-[11px] font-medium text-slate-500 sm:text-xs";
  const metricDark = darkMode;

  // Strict 12-col grid — every block declares its column span so nothing
  // floats or overlaps. On mobile the grid collapses to 1 column.
  return (
    <section
      className={`proposal-hero proposal-hero-orchestrated relative overflow-hidden rounded-3xl border p-4 sm:p-8 md:p-9 lg:p-10 ${
        darkMode
          ? "border-white/10 bg-slate-900 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)]"
          : "border-slate-200/90 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.12)]"
      }`}
    >
      {/* Soft document wash — screen only; print stays clean white via globals */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${
          darkMode
            ? "bg-[radial-gradient(ellipse_90%_70%_at_50%_-20%,rgba(56,189,248,0.12),transparent_55%)]"
            : "bg-[radial-gradient(ellipse_100%_85%_at_50%_-30%,rgba(14,165,233,0.07),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(16,185,129,0.05),transparent_50%)]"
        }`}
      />
      <div className="relative">
        {/* ── 1. INSTALLER BAR (Logo · Name · Tagline · Contact) ─────────── */}
        <div
          className={`grid grid-cols-12 items-center gap-4 border-b border-dashed pb-5 sm:pb-6 ${
            darkMode ? "border-white/15" : "border-slate-200/80"
          }`}
        >
          <div className="col-span-12 flex min-w-0 items-center sm:col-span-7">
            {installerLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={installerLogoUrl}
                alt=""
                className="proposal-print-logo h-16 w-auto max-w-[min(320px,80vw)] object-contain object-left sm:h-20 sm:max-w-[380px] print:h-[4.5rem] print:max-w-[min(72mm,100%)]"
              />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-sky-500 to-emerald-600 text-white shadow-md sm:h-14 sm:w-14">
                <Sun className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
            )}
            {!installerLogoUrl ? (
              <motion.div className="min-w-0">
                <p className={`truncate text-lg font-bold tracking-tight sm:text-xl ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {summary.installer}
                </p>
                <p className={darkMode ? `${taglineClass} text-slate-400` : taglineClass}>{summary.tagline}</p>
              </motion.div>
            ) : null}
          </div>
          <div className={`col-span-12 sm:col-span-5 sm:text-right ${darkMode ? "text-slate-200" : ""}`}>
            <p className={`text-[10px] font-semibold ${darkMode ? "text-slate-500" : "text-slate-400"} ${lang === "hi" ? "tracking-normal" : "uppercase tracking-wide"}`}>
              {D["hero.contactLabel"]}
            </p>
            <p className={`text-xs font-semibold sm:text-sm ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{summary.contact}</p>
          </div>
        </div>

        <div className="proposal-hero-body mt-6 flex flex-col gap-0 sm:mt-7">
        {/* ── 2. KICKER + CUSTOMER NAME ──────────────────────────────────── */}
        <div className="proposal-hero-intro order-1">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`text-xs font-semibold sm:text-sm ${darkMode ? "text-sky-400" : "text-sky-700"} ${lang === "hi" ? "tracking-normal" : "tracking-wide"}`}
          >
            {D["slide.cover.kicker"]}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className={`mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-tight ${
              darkMode ? "text-white" : "text-slate-950"
            }`}
          >
            {displayName}
          </motion.h1>
          {location ? (
            <p className={`mt-1 text-sm sm:text-base ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{location}</p>
          ) : null}
        </div>

        <div className="proposal-hero-ribbon-slot order-2 mt-5 md:order-5 md:mt-6">
          <HeroSavingsRibbon
            annualSaving={summary.annualSaving}
            paybackYears={summary.paybackYears}
            netCost={summary.netCost}
            subsidy={summary.pmSubsidy}
            labels={{
              saving: D["common.annualSaving"],
              payback: D["common.payback"],
              net: D["common.netCost"],
              subsidy: lang === "hi" ? "सब्सिडी" : "Subsidy"
            }}
          />
        </div>

        {/* ── 3. CUSTOMER PROFILE ───────────────────────────────────────── */}
        <div className="proposal-hero-profile order-3 mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-2.5 md:grid-cols-3">
          {[
            { l: D["profile.consumerId"], v: profileFieldOrDash(cp.consumerId) },
            { l: D["profile.meterNo"], v: profileFieldOrDash(cp.meterNumber) },
            { l: D["profile.connectionDate"], v: formatConnectionDate(cp.connectionDate) },
            { l: D["profile.connectionType"], v: expandConnectionType(cp.connectionType, lang) },
            { l: D["profile.phase"], v: profileFieldOrDash(cp.phase) },
            { l: D["profile.sanctionedLoad"], v: cp.sanctionedLoadKw ? `${cp.sanctionedLoadKw} kW` : "—" }
          ].map((c, i) => (
            <motion.div
              key={c.l}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.05 + i * 0.04 }}
              className={`min-w-0 rounded-xl border px-3 py-2.5 ${
                darkMode
                  ? "border-white/10 bg-white/[0.06]"
                  : "border-slate-200/90 bg-slate-50/90 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
              }`}
            >
              <p
                className={`truncate text-[10px] font-semibold ${
                  darkMode ? "text-slate-500" : "text-slate-500"
                } ${lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-wide"}`}
              >
                {c.l}
              </p>
              <p
                className={`mt-1 truncate text-[13px] font-bold leading-tight sm:text-sm ${darkMode ? "text-white" : "text-slate-900"}`}
                title={c.v}
              >
                {c.v}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── 4. ABOUT-US BLURB (1 short paragraph from companyProfile) ──── */}
        {cmp.aboutUsParagraphs?.[0] ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`mt-6 rounded-2xl border-l-4 p-4 sm:p-5 ${
              darkMode
                ? "border border-white/10 border-l-emerald-400 bg-emerald-950/25"
                : "border border-emerald-100/90 border-l-emerald-500 bg-emerald-50/40"
            }`}
          >
            <p
              className={`text-[10px] font-bold ${
                darkMode ? "text-emerald-400" : "text-emerald-800"
              } ${lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-wide"}`}
            >
              {D["hero.aboutInstaller"].replace("%INSTALLER%", summary.installer)}
            </p>
            <p className={`mt-1.5 text-[13px] leading-relaxed sm:text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
              {cmp.aboutUsParagraphs[0]}
            </p>
          </motion.div>
        ) : null}

        {/* ── 5. SYSTEM SUMMARY ─────────────────────────────────────────── */}
        <div className="proposal-hero-metrics order-4 mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-2.5 md:grid-cols-3 lg:grid-cols-5">
          <StatTile label={D["common.system"]} value={`${summary.systemKw} kW`} delay={0.05} lang={lang} dark={metricDark} />
          <StatTile label={D["common.panels"]} value={String(summary.panels)} rawValue={summary.panels} delay={0.1} lang={lang} dark={metricDark} />
          <StatTile label={D["common.netCost"]} value={inrK(summary.netCost)} tone="blue" delay={0.15} lang={lang} dark={metricDark} />
          <StatTile label={D["common.payback"]} value={`${summary.paybackYears.toFixed(1)} ${D["emi.years"]}`} tone="green" delay={0.2} lang={lang} dark={metricDark} />
          <StatTile
            label={D["common.lifeProfit"]}
            value={inrK(summary.lifetime25Profit)}
            tone={summary.lifetime25Profit > 0 ? "green" : "rose"}
            delay={0.25}
            lang={lang}
            dark={metricDark}
          />
        </div>

        <div
          className={`proposal-hero-foot order-5 mt-5 flex flex-col gap-2 border-t pt-4 sm:mt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 md:order-6 ${
            darkMode ? "border-white/10" : "border-slate-200/80"
          }`}
        >
          <p className={`text-[10px] leading-snug sm:max-w-[70%] sm:text-[11px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {D["common.engineNote"]}
          </p>
          <p className={`shrink-0 text-[10px] font-medium sm:text-right sm:text-[11px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            {PROPOSAL_PLATFORM_CREDIT}
          </p>
        </div>
        </div>

        {/* ── 6. WIDE BOTTOM IMAGE — bleed effect, strictly at page bottom ── */}
        {heroBottomImage ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mt-7 overflow-hidden rounded-2xl shadow-lg shadow-slate-900/15 sm:mt-8"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroBottomImage} alt="Solar installation" className="h-44 w-full object-cover sm:h-56 lg:h-64" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-slate-900/35 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-950 to-transparent px-4 pb-4 pt-16 sm:px-6 sm:pb-5 sm:pt-20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p
                    className={`text-[10px] font-bold text-emerald-300/95 sm:text-xs ${
                      lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-wide"
                    }`}
                  >
                    {D["hero.engineeredEyebrow"]}
                  </p>
                  <p className="mt-0.5 text-base font-bold leading-tight text-white sm:text-lg">{D["hero.localTeamBold"]}</p>
                  <p className="mt-1 max-w-xl text-[11px] leading-snug text-white/85 sm:text-sm">{D["hero.localTeamFine"]}</p>
                </div>
                <p className="text-[10px] font-semibold text-emerald-100/90 sm:text-right sm:text-xs">
                  {summary.installer}
                  <span className="mx-1.5 opacity-50">·</span>
                  {cmp.installationsDone} {cmp.installationsLabel}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mt-7 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 p-5 text-white shadow-lg sm:mt-8 sm:p-7"
          >
            <p
              className={`text-[10px] font-bold text-emerald-300 sm:text-xs ${
                lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-wide"
              }`}
            >
              {D["hero.engineeredEyebrow"]}
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight sm:text-2xl">{D["hero.localTeamBold"]}</p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/85 sm:text-sm">{D["hero.localTeamFine"]}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function SystemRequirementSection({
  D,
  summary,
  lang
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  lang: ProposalLang;
}) {
  const monthlyGen = Math.round(summary.annualGen / 12);
  const inverterLabel = summary.brands?.inverter ?? summary.panelBrand ?? "—";
  const panelLabel = summary.brands?.panel ?? summary.panelBrand ?? "—";
  const surplus = Math.max(0, summary.annualGen - summary.annualUse);

  return (
    <ProposalJourneySection id="system-requirement" className="proposal-system-requirement-section">
      <SectionHeader
        step={3}
        kicker={D["slide.requirement.kicker"]}
        title={D["slide.requirement.title"]}
        subtitle={D["slide.requirement.subtitle"]}
        lang={lang}
      />

      <p className="proposal-requirement-note mb-6 rounded-xl border border-indigo-200/70 bg-indigo-50/80 px-4 py-3 text-sm leading-relaxed text-slate-800 dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-slate-200">
        {D["req.designNote"]}
      </p>

      <div className="proposal-requirement-hero mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProposalPanel emphasis="highlight" className="flex flex-col gap-1 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{D["common.system"]}</p>
          <p className="text-3xl font-extrabold tabular-nums text-indigo-800 dark:text-indigo-200">
            {summary.systemKw} kW
          </p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {summary.panels} × {D["common.panels"]} (540 W class)
          </p>
        </ProposalPanel>
        <ProposalPanel className="flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{D["gen.annualGen"]}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-800 dark:text-emerald-300">
            {summary.annualGen.toLocaleString("en-IN")} u
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {D["req.monthlyGen"]}: ~{monthlyGen.toLocaleString("en-IN")} u
          </p>
        </ProposalPanel>
        <ProposalPanel className="flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{D["req.estimatedUse"]}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-sky-900 dark:text-sky-200">
            {summary.annualUse.toLocaleString("en-IN")} u
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {D["gen.coverage"]}: {summary.coverage}%
          </p>
        </ProposalPanel>
      </div>

      <div className="proposal-requirement-spec grid gap-4 md:grid-cols-2">
        <ProposalPanel className="sm:p-6">
          <div className="flex items-start gap-3">
            <Sun className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{D["req.specPanels"]}</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">{panelLabel}</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" aria-hidden />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{D["req.specInverter"]}</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">{inverterLabel}</p>
            </div>
          </div>
        </ProposalPanel>
        <ProposalPanel className="sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{D["req.financialTitle"]}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile label={D["common.netCost"]} value={inr(summary.netCost)} tone="blue" lang={lang} />
            <StatTile
              label={D["common.annualSaving"]}
              value={inr(summary.annualSaving)}
              rawValue={summary.annualSaving}
              tone="green"
              lang={lang}
            />
            <StatTile
              label={D["common.payback"]}
              value={`${summary.paybackYears.toFixed(1)} ${D["emi.years"]}`}
              tone="ink"
              lang={lang}
            />
            <StatTile label={D["gen.coverage"]} value={`${summary.coverage}%`} tone="green" lang={lang} />
          </div>
          {surplus > 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {D["gen.surplus"]}: ~{surplus.toLocaleString("en-IN")} u / yr
            </p>
          ) : null}
        </ProposalPanel>
      </div>
    </ProposalJourneySection>
  );
}

function DeepAuditSection({ D, summary, monthLbls, lang }: { D: ProposalDict; summary: ProposalDeckSummary; monthLbls: string[]; lang: ProposalLang }) {
  return (
    <ProposalJourneySection id="bill-audit" className="proposal-bill-audit-section">
      <SectionHeader step={3} kicker={D["slide.audit.kicker"]} title={D["slide.audit.title"]} subtitle={D["slide.audit.subtitle"]} lang={lang} />

      <div className="proposal-audit-stage">
      <div className="proposal-audit-stack-chart">
      <ProposalPanel variant="flat" className="proposal-audit-chart-panel">
        <div className="proposal-audit-chart-wrap min-h-[11rem] sm:min-h-[16rem] md:min-h-[15rem] lg:min-h-[18rem]">
          <MonthlyBillsChart values={summary.auditRows.map((r) => r.total)} labels={monthLbls} peakIndices={[3, 4, 5, 6]} />
        </div>
      </ProposalPanel>
      {summary.mpSmartBillingCaption ? (
        <p className="proposal-audit-mp-caption mt-4 rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-xs leading-relaxed text-slate-800">
          <span className="font-bold text-sky-900">{D["audit.mpSmartPrefix"]} </span>
          {summary.mpSmartBillingCaption}
        </p>
      ) : null}
      </div>

      {/* Month-wise table — full width; horizontal scroll on phone & iPad */}
      <div className="proposal-audit-table-block">
        <p
          className="mb-2 flex items-start gap-2 rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2.5 text-[11px] leading-snug text-slate-700 shadow-sm xl:hidden print:hidden"
          role="note"
        >
          <ChevronsLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
          <span>{D["audit.swipeHint"]}</span>
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="proposal-audit-table-scroll overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth rounded-2xl [-webkit-overflow-scrolling:touch] xl:overflow-x-visible">
            <table className="proposal-audit-table min-w-[760px] w-full border-separate border-spacing-0 text-[13px] xl:min-w-0 xl:table-fixed xl:text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th
                    scope="col"
                    className={`sticky left-0 z-30 min-w-[4rem] whitespace-nowrap border-b border-slate-700 bg-slate-900 px-3 py-3 text-left text-xs font-bold shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)] sm:static sm:z-auto sm:w-[10%] sm:px-2.5 sm:py-2.5 sm:text-sm sm:shadow-none ${
                      lang === "hi" ? "tracking-normal text-white" : "uppercase tracking-wider text-white"
                    }`}
                  >
                    {D["audit.month"]}
                  </th>
                  <th
                    scope="col"
                    className={`border-b border-slate-700 px-3 py-3 text-right text-xs sm:w-[9%] sm:px-2.5 sm:py-2.5 sm:text-sm ${
                      lang === "hi" ? "font-bold tracking-normal text-white" : "font-bold uppercase tracking-wider text-white"
                    }`}
                  >
                    {D["audit.units"]}
                  </th>
                  <th
                    scope="col"
                    className={`border-b border-slate-700 px-3 py-3 text-right text-xs sm:w-[17%] sm:px-2.5 sm:py-2.5 sm:text-sm ${
                      lang === "hi" ? "font-bold tracking-normal text-white" : "font-bold uppercase tracking-wider text-white"
                    }`}
                  >
                    {D["audit.energy"]}
                  </th>
                  <th
                    scope="col"
                    className={`border-b border-slate-700 px-3 py-3 text-right text-xs sm:w-[15%] sm:px-2.5 sm:py-2.5 sm:text-sm ${
                      lang === "hi" ? "font-bold tracking-normal text-white" : "font-bold uppercase tracking-wider text-white"
                    }`}
                  >
                    {D["audit.fixed"]}
                  </th>
                  <th
                    scope="col"
                    className={`border-b border-slate-700 px-3 py-3 text-right text-xs sm:w-[17%] sm:px-2.5 sm:py-2.5 sm:text-sm ${
                      lang === "hi" ? "font-bold tracking-normal text-white" : "font-bold uppercase tracking-wider text-white"
                    }`}
                  >
                    {D["audit.dutyFuel"]}
                  </th>
                  <th
                    scope="col"
                    className={`min-w-[9rem] border-b border-slate-700 px-3 py-3 text-right text-xs sm:min-w-0 sm:w-[32%] sm:px-2.5 sm:py-2.5 sm:text-sm ${
                      lang === "hi" ? "font-bold tracking-normal text-white" : "font-bold uppercase tracking-wider text-white"
                    }`}
                  >
                    {D["audit.netBill"]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.auditRows.map((r, i) => {
                  const isPeak = i >= 3 && i <= 6;
                  /** Opaque row + sticky cell backgrounds — semi-transparent rows caused scrolled columns to show through the Month column on mobile. */
                  const rowBg = isPeak ? "bg-rose-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50";
                  const stickyMonthClass = `sticky left-0 z-20 min-w-[4rem] whitespace-nowrap border-b border-slate-200 px-3 py-3 text-[15px] font-bold text-slate-900 shadow-[4px_0_6px_-2px_rgba(15,23,42,0.12)] sm:static sm:z-auto sm:min-w-0 sm:px-2.5 sm:py-2.5 sm:text-sm sm:shadow-none ${rowBg}`;
                  return (
                    <tr key={r.label} className={rowBg}>
                      <td className={stickyMonthClass}>{monthLbls[i]}</td>
                      <td className="border-b border-slate-100 bg-inherit px-3 py-3 text-right text-[15px] font-bold tabular-nums text-slate-800 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                        {r.units}
                      </td>
                      <td className="border-b border-slate-100 bg-inherit px-3 py-3 text-right text-[15px] font-bold tabular-nums text-slate-800 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                        {inr(r.energy)}
                      </td>
                      <td className="border-b border-slate-100 bg-inherit px-3 py-3 text-right text-[15px] font-bold tabular-nums text-slate-800 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                        {inr(r.fixed)}
                      </td>
                      <td className="border-b border-slate-100 bg-inherit px-3 py-3 text-right text-[15px] font-bold tabular-nums text-slate-800 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                        {inr(r.duty + r.fuel)}
                      </td>
                      <td className="border-b border-slate-100 bg-inherit px-3 py-3 text-right align-top sm:px-2.5 sm:py-2.5">
                        <AuditNetBillCell D={D} total={r.total} subsidy={r.subsidy} isPeak={isPeak} />
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-sky-50 font-bold text-sky-900">
                  <td className="sticky left-0 z-20 min-w-[4rem] whitespace-nowrap border-b border-sky-100 bg-sky-50 px-3 py-3 text-[15px] font-bold shadow-[4px_0_6px_-2px_rgba(14,116,144,0.15)] sm:static sm:z-auto sm:min-w-0 sm:px-2.5 sm:py-2.5 sm:text-sm sm:shadow-none">
                    {D["audit.total"]}
                  </td>
                  <td className="border-b border-sky-100 bg-sky-50 px-3 py-3 text-right text-[15px] font-bold tabular-nums text-sky-950 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                    {summary.auditTotals.units}
                  </td>
                  <td className="border-b border-sky-100 bg-sky-50 px-3 py-3 text-right text-[15px] font-bold tabular-nums text-sky-950 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                    {inr(summary.auditTotals.energy)}
                  </td>
                  <td className="border-b border-sky-100 bg-sky-50 px-3 py-3 text-right text-[15px] font-bold tabular-nums text-sky-950 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                    {inr(summary.auditTotals.fixed)}
                  </td>
                  <td className="border-b border-sky-100 bg-sky-50 px-3 py-3 text-right text-[15px] font-bold tabular-nums text-sky-950 sm:px-2.5 sm:py-2.5 sm:text-sm md:text-[15px]">
                    {inr(summary.auditTotals.duty + summary.auditTotals.fuel)}
                  </td>
                  <td className="border-b border-sky-100 bg-sky-50 px-3 py-3 text-right align-top sm:px-2.5 sm:py-2.5">
                    <AuditNetBillCell
                      D={D}
                      total={summary.auditTotals.total}
                      subsidy={summary.auditTotals.subsidy}
                      variant="total"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div className="proposal-audit-insights proposal-orchestrated-insights grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <div className="proposal-audit-insight-card rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 to-rose-100/50 p-4 shadow-sm sm:p-5">
          <p
            className={`text-[10px] font-bold text-rose-700 ${
              lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
            }`}
          >
            {D["insight.summer.title"]}
          </p>
          <p className="proposal-audit-insight-value mt-2 text-2xl font-bold text-rose-900 sm:text-3xl">
            <AnimatedNumber value={summary.summerPct} suffix="%" />
          </p>
          <p className="proposal-audit-insight-sub mt-1 text-xs text-rose-800 sm:text-sm">{D["insight.summer.sub"]}</p>
        </div>
        <div className="proposal-audit-insight-card rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 shadow-sm sm:p-5">
          <p
            className={`text-[10px] font-bold text-amber-700 ${
              lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
            }`}
          >
            {D["insight.fixed.title"]}
          </p>
          <p className="proposal-audit-insight-value mt-2 text-2xl font-bold text-amber-900 sm:text-3xl">
            <AnimatedINR value={summary.fixedAnnual} />
          </p>
          <p className="proposal-audit-insight-sub mt-1 text-xs text-amber-800 sm:text-sm">{D["insight.fixed.sub"]}</p>
        </div>
        <div className="proposal-audit-insight-card rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 shadow-sm sm:p-5">
          <p
            className={`text-[10px] font-bold text-slate-600 ${
              lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
            }`}
          >
            {D["insight.duty.title"]}
          </p>
          <p className="proposal-audit-insight-value mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            <AnimatedINR value={summary.auditTotals.duty + summary.auditTotals.fuel} />
          </p>
          <p className="proposal-audit-insight-sub mt-1 text-xs text-slate-700 sm:text-sm">{D["insight.duty.sub"]}</p>
        </div>
        <div className="proposal-audit-insight-card rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm sm:p-5">
          <p
            className={`text-[10px] font-bold text-emerald-700 ${
              lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
            }`}
          >
            {D["insight.solar.title"]}
          </p>
          <p className="proposal-audit-insight-value mt-2 text-2xl font-bold text-emerald-900 sm:text-3xl">
            <AnimatedNumber value={summary.totalReduction} suffix="%" />
          </p>
          <p className="proposal-audit-insight-sub mt-1 text-xs text-emerald-800 sm:text-sm">
            <AnimatedINR value={summary.annualSaving} />
            {D["common.perYr"]}
          </p>
        </div>
      </div>
      </div>
    </ProposalJourneySection>
  );
}

function EconomicsSection({
  D,
  summary,
  monthLbls,
  lang
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  monthLbls: string[];
  lang: ProposalLang;
}) {
  const monthlyGen = Math.round(summary.annualGen / 12);
  const [selectedTenure, setSelectedTenure] = useState<number | null>(summary.emi[1]?.tenureYears ?? null);
  const [showFinance, setShowFinance] = useState(false);

  return (
    <ProposalJourneySection id="economics" className="proposal-economics-stage">
      <SectionHeader step={4} kicker={D["slide.economics.kicker"]} title={D["slide.economics.title"]} subtitle={D["slide.economics.subtitle"]} lang={lang} />

      <motion.div className="proposal-financial-hero mb-6">
        <div className="proposal-financial-hero-tile proposal-financial-hero-tile--saving">
          <p className="proposal-hero-ribbon-label">{D["common.annualSaving"]}</p>
          <p className="proposal-hero-ribbon-value">
            <AnimatedINR value={summary.annualSaving} />
          </p>
          <p className="proposal-hero-ribbon-hint">{D["common.perYr"]}</p>
        </div>
        <div className="proposal-financial-hero-tile proposal-panel">
          <p className="proposal-hero-ribbon-label">{D["common.payback"]}</p>
          <p className="proposal-hero-ribbon-value">{summary.paybackYears.toFixed(1)} {D["emi.years"]}</p>
        </div>
        <div className="proposal-financial-hero-tile proposal-panel">
          <p className="proposal-hero-ribbon-label">{D["econ.netSaving"]}</p>
          <p className="proposal-hero-ribbon-value">
            <AnimatedINR value={summary.solarVsGrid.netSaving} />
          </p>
          <p className="proposal-hero-ribbon-hint">25 {D["emi.years"]}</p>
        </div>
        <div className="proposal-financial-hero-tile proposal-panel">
          <p className="proposal-hero-ribbon-label">{D["common.netCost"]}</p>
          <p className="proposal-hero-ribbon-value">
            <AnimatedINR value={summary.netCost} />
          </p>
        </div>
      </motion.div>

      <div className="proposal-economics-pair grid gap-4 md:grid-cols-2">
        {/* Generation vs Usage */}
        <ProposalPanel className="sm:p-6">
          <p
            className={`text-xs text-slate-500 ${
              lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-[0.18em]"
            }`}
          >
            {D["gen.title"]}
          </p>
          <div className="mt-4">
            <GenVsUseChart
              labels={monthLbls}
              gen={summary.auditRows.map(() => monthlyGen)}
              use={summary.auditRows.map((r) => r.units)}
              legendGen={D["gen.annualGen"]}
              legendUse={D["gen.annualUse"]}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p
                className={`text-[10px] text-emerald-700 ${
                  lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-wider"
                }`}
              >
                {D["gen.annualGen"]}
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{summary.annualGen.toLocaleString("en-IN")} u</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p
                className={`text-[10px] text-sky-700 ${
                  lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-wider"
                }`}
              >
                {D["gen.coverage"]}
              </p>
              <p className="mt-1 text-lg font-bold text-sky-900">{summary.coverage}%</p>
            </div>
          </div>
        </ProposalPanel>

        {/* EMI calculator */}
        <ProposalPanel className="sm:p-6">
          <div className="flex items-center justify-between">
            <p
              className={`text-xs text-slate-500 ${
                lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-[0.18em]"
              }`}
            >
              {D["emi.title"]}
            </p>
            <button
              type="button"
              onClick={() => setShowFinance((s) => !s)}
              className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
            >
              {showFinance ? "−" : "+"} {D["emi.financeCta"]}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {D["emi.principal"]}: <span className="font-semibold text-slate-700">{inr(summary.netCost)}</span>
            {" · "}
            {D["emi.rate"]}: 7% p.a.
          </p>
          <div className="mt-4 space-y-2">
            {summary.emi.map((row) => {
              const selected = selectedTenure === row.tenureYears;
              return (
                <button
                  type="button"
                  key={row.tenureYears}
                  onClick={() => setSelectedTenure(row.tenureYears)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${selected ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div>
                    <p className={`text-sm font-bold ${selected ? "text-emerald-900" : "text-slate-900"}`}>
                      {row.tenureYears} {D["emi.years"]}
                    </p>
                    <p className="text-[11px] text-slate-500">{D["emi.totalInterest"]}: {inr(row.totalInterest)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${selected ? "text-emerald-700" : "text-slate-900"}`}>
                      {inr(row.monthlyEmi)}
                      <span className="text-[11px] font-medium text-slate-500">
                        {lang === "hi" ? "/माह" : "/mo"}
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {showFinance ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="mt-4 rounded-xl bg-slate-900 p-4 text-white"
            >
              <p className="text-xs font-bold tracking-wider text-sky-300">{D["emi.financeCta"]}</p>
              <p className="mt-2 text-xs text-slate-300">
                {selectedTenure
                  ? `${selectedTenure} ${D["emi.years"]} · ${inr(summary.emi.find((r) => r.tenureYears === selectedTenure)?.monthlyEmi ?? 0)}${lang === "hi" ? "/माह" : "/mo"}`
                  : D["emi.title"]}
              </p>
              <a
                href="https://wa.me/?text=Hi%2C%20I%20am%20interested%20in%20a%20Solar%20Loan."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" /> {D["econ.connectCta"]}
              </a>
            </motion.div>
          ) : null}
        </ProposalPanel>
      </div>

      {/* 25-yr comparison */}
      <div className="proposal-economics-longterm mt-7 grid gap-4 sm:mt-8 md:grid-cols-5">
        <ProposalPanel emphasis="highlight" className="sm:col-span-3 sm:p-6">
          <SolarVsGridChart
            years={summary.solarVsGrid.years}
            grid={summary.solarVsGrid.gridCumulative}
            solar={summary.solarVsGrid.solarCumulative}
          />
        </ProposalPanel>
        <div className="grid gap-3 sm:col-span-2">
          <StatTile label={D["econ.grid25"]} value={inr(summary.solarVsGrid.totalGrid)} tone="rose" lang={lang} />
          <StatTile label={D["econ.solar25"]} value={inr(summary.solarVsGrid.totalSolar)} tone="blue" lang={lang} />
          <StatTile label={D["econ.netSaving"]} value={inr(summary.solarVsGrid.netSaving)} tone="green" lang={lang} />
        </div>
      </div>
    </ProposalJourneySection>
  );
}

function TreeAnimation({ count, inView }: { count: number; inView: boolean }) {
  const treesPerRow = 8;
  const maxTrees = Math.min(count, 24);
  const rows = Math.ceil(maxTrees / treesPerRow);
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {Array.from({ length: maxTrees }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, y: 8 }}
          animate={inView ? { opacity: 1, scale: 1, y: 0 } : undefined}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <TreeDeciduous className="h-5 w-5 text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
        </motion.div>
      ))}
      {count > maxTrees && (
        <span className="self-center text-xs font-bold text-emerald-700">+{(count - maxTrees).toLocaleString("en-IN")}</span>
      )}
    </div>
  );
}

function EnvironmentSection({ D, summary, lang }: { D: ProposalDict; summary: ProposalDeckSummary; lang: ProposalLang }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const env = summary.environmental;
  const treeCountRaw = useCountUp(env.treeEquivalent, inView);
  const co2CountRaw = useCountUp(env.lifetimeCo2TonsSaved, inView);
  const genCountRaw = useCountUp(summary.annualGen, inView);
  const treeCount = displayCountUp(treeCountRaw, env.treeEquivalent);
  const co2Count = displayCountUp(co2CountRaw, env.lifetimeCo2TonsSaved);
  const genCount = displayCountUp(genCountRaw, summary.annualGen);

  // 1-year tree equivalent
  const yearlyTrees = Math.round(env.treeEquivalent / 25);

  return (
    <ProposalJourneySection id="environment">
      <SectionHeader step={5} kicker={D["slide.environment.kicker"]} title={D["slide.environment.title"]} subtitle={D["slide.environment.subtitle"]} lang={lang} />
      <div ref={ref} className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0 }}
          className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm sm:p-5"
        >
          <Leaf className="h-6 w-6 text-emerald-600 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-emerald-900">{co2Count}<span className="text-base font-medium"> t</span></p>
          <p
            className={`mt-1 text-[11px] text-emerald-700 ${
              lang === "hi" ? "font-semibold tracking-normal normal-case" : "font-semibold uppercase tracking-widest"
            }`}
          >
            {D["env.co2"]}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-100/50 p-4 shadow-sm sm:p-5"
        >
          <TreeDeciduous className="h-6 w-6 text-emerald-600 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-emerald-900">{treeCount.toLocaleString("en-IN")}</p>
          <p
            className={`mt-1 text-[11px] text-emerald-700 ${
              lang === "hi" ? "font-semibold tracking-normal normal-case" : "font-semibold uppercase tracking-widest"
            }`}
          >
            {D["env.trees"]}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 shadow-sm sm:p-5"
        >
          <Sun className="h-6 w-6 text-sky-600 drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-sky-900">{genCount.toLocaleString("en-IN")}<span className="text-base font-medium"> u</span></p>
          <p
            className={`mt-1 text-[11px] text-sky-700 ${
              lang === "hi" ? "font-semibold tracking-normal normal-case" : "font-semibold uppercase tracking-widest"
            }`}
          >
            {D["env.solarYearly"]}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-violet-100/50 p-4 shadow-sm sm:p-5"
        >
          <Sparkles className="h-6 w-6 text-violet-600 drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-violet-900">{summary.coverage}%</p>
          <p
            className={`mt-1 text-[11px] text-violet-700 ${
              lang === "hi" ? "font-semibold tracking-normal normal-case" : "font-semibold uppercase tracking-widest"
            }`}
          >
            {D["env.coverage"]}
          </p>
        </motion.div>
      </div>

      {/* Animated carbon offset highlight card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-6 text-white shadow-[0_8px_40px_rgba(16,185,129,0.25)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={`text-xs text-emerald-300 ${
                lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-[0.32em]"
              }`}
            >
              {D["env.offsetKicker"]}
            </p>
            <p className="mt-3 text-2xl font-bold sm:text-3xl">
              {(() => {
                const [a, b] = D["env.offsetTreesLine"].split("%N%");
                return (
                  <>
                    {a}
                    <AnimatedNumber value={yearlyTrees} className="text-emerald-300" />
                    {b ?? ""}
                  </>
                );
              })()}
            </p>
            <p className="mt-2 text-sm text-emerald-200/80">
              {D["env.offsetSubLine"].replace("%T%", treeCount.toLocaleString("en-IN"))}
            </p>
          </div>
          <TreeDeciduous className="h-16 w-16 flex-shrink-0 text-emerald-400 opacity-30" />
        </div>
        <TreeAnimation count={Math.min(yearlyTrees, 40)} inView={inView} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white sm:p-10"
      >
        <p
          className={`text-xs text-emerald-300 ${
            lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-[0.32em]"
          }`}
        >
          {D["env.legacy.title"]}
        </p>
        <p className="mt-3 text-base text-slate-300 sm:text-lg">{D["env.legacy.sub"]}</p>
      </motion.div>
    </ProposalJourneySection>
  );
}

function CompanyProfileSection({
  D,
  lang,
  summary,
  siteImages
}: {
  D: ProposalDict;
  lang: ProposalLang;
  summary: ProposalDeckSummary;
  siteImages?: string[];
}) {
  const cp = resolvedCompanyProfileForLang(summary.companyProfile, lang);
  const expertiseCategories = expertiseCategoriesCopy(lang);
  const scale = solutionsForEveryScale(lang);
  const trustTitle = whyCustomersChooseUsTitle(lang);

  return (
    <ProposalJourneySection id="expertise">
      <SectionHeader step={2} kicker={D["slide.about.kicker"]} title={scale.title} subtitle={scale.subtitle} lang={lang} />

      {/* Three expertise cards — strict 3-column grid, equal heights */}
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        {expertiseCategories.map((cat, i) => {
          const icons = [Home, Building2, Factory] as const;
          const CardIcon = icons[i] ?? Home;
          const catImg = siteImages?.[2 + i] ?? DEFAULT_EXPERTISE_CARD_IMAGES[i];
          const colorMap: Record<string, string> = {
            sky: "border-sky-200/70 bg-gradient-to-br from-sky-50 to-white",
            violet: "border-violet-200/70 bg-gradient-to-br from-violet-50 to-white",
            amber: "border-amber-200/70 bg-gradient-to-br from-amber-50 to-white"
          };
          const iconMap: Record<string, string> = {
            sky: "bg-sky-500",
            violet: "bg-violet-500",
            amber: "bg-amber-500"
          };
          const textMap: Record<string, string> = {
            sky: "text-sky-900",
            violet: "text-violet-900",
            amber: "text-amber-900"
          };
          return (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 + i * 0.08 }}
              className={`flex flex-col overflow-hidden rounded-2xl border shadow-[0_4px_20px_rgba(15,23,42,0.06)] backdrop-blur-sm ${colorMap[cat.color]}`}
            >
              <div className="relative h-48 overflow-hidden sm:h-52">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={catImg}
                  alt={cat.title}
                  className="h-full w-full object-cover object-center"
                  style={{ objectPosition: i === 0 ? "center 28%" : i === 1 ? "center 32%" : "center 40%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconMap[cat.color]} shadow-md`}>
                    <CardIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white drop-shadow-sm">{cat.title}</p>
                    <p
                      className={`truncate text-[10px] font-semibold text-white/90 drop-shadow-sm ${
                        lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-wider"
                      }`}
                    >
                      {cat.subtitle}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <ul className="space-y-1.5">
                  {cat.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-700">
                      <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${textMap[cat.color]} opacity-70`} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mid-band: company differentiators (4 bullets in single row) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-5 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:p-5"
      >
        <p
          className={`text-[10px] font-bold text-emerald-700 ${
            lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.22em]"
          }`}
        >
          {trustTitle}
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {cp.bullets.slice(0, 4).map((b, i) => (
            <motion.li
              key={b}
              initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.25 + i * 0.05 }}
              className="flex items-start gap-2 text-xs font-medium text-slate-700 sm:text-[13px]"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
              <span>{b}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Stats footer — Founded · Installs · Locations · GST (NO floating, neatly inline) */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: D["about.founded"], v: cp.founded, accent: "from-sky-50 to-white border-sky-200/70 text-sky-900" },
          { l: D["about.installations"], v: cp.installationsDone, accent: "from-emerald-50 to-white border-emerald-200/70 text-emerald-900" },
          { l: D["about.locations"], v: cp.locations, accent: "from-violet-50 to-white border-violet-200/70 text-violet-900" },
          ...(cp.gstNumber?.trim()
            ? [{ l: D["about.gst"], v: cp.gstNumber.trim(), accent: "from-amber-50 to-white border-amber-200/70 text-amber-900" }]
            : [])
        ].map((item, i) => (
          <motion.div
            key={item.l}
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.3 + i * 0.05 }}
            className={`rounded-xl border bg-gradient-to-br p-3 backdrop-blur-sm shadow-[0_2px_10px_rgba(15,23,42,0.04)] ${item.accent}`}
          >
            <p
              className={`text-[9px] font-bold text-slate-500 ${
                lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
              }`}
            >
              {item.l}
            </p>
            <p className="mt-1 truncate text-sm font-extrabold leading-tight" title={item.v}>{item.v}</p>
          </motion.div>
        ))}
      </div>
    </ProposalJourneySection>
  );
}

function TechnicalProposalSection({ D, lang, summary }: { D: ProposalDict; lang: ProposalLang; summary: ProposalDeckSummary }) {
  const blocks = [
    { title: lang === "hi" ? "सोलर पैनल" : "Solar Panels", sub: `${summary.panels} × 540W ${summary.brands.panel}` },
    { title: lang === "hi" ? "DC केबल + DCDB" : "DC Cabling + DCDB", sub: "TUV 4mm² · SPD" },
    { title: lang === "hi" ? "ऑन-ग्रिड इन्वर्टर" : "On-Grid Inverter", sub: `${summary.systemKw} kW · MPPT` },
    { title: lang === "hi" ? "AC केबल + ACDB" : "AC Cabling + ACDB", sub: "MCB · Earthing" },
    { title: lang === "hi" ? "नेट मीटर" : "Net Meter", sub: lang === "hi" ? "द्विदिशीय" : "Bi-directional" },
    { title: lang === "hi" ? "MP ग्रिड / लोड" : "MP Grid / Load", sub: lang === "hi" ? "ऊर्जा निर्यात/आयात" : "Energy export/import" }
  ];
  const stages = lang === "hi"
    ? [
        { d: "दिन 1-2", t: "साइट सर्वे एवं डिज़ाइन", s: "छाया विश्लेषण, स्ट्रक्चरल जांच" },
        { d: "दिन 3-5", t: "DISCOM + ऑर्डर", s: "नेट-मीटर, सब्सिडी फॉर्म" },
        { d: "दिन 6-7", t: "स्ट्रक्चर इंस्टाल", s: "GI रेल्स, माउंटिंग" },
        { d: "दिन 7-9", t: "पैनल + इन्वर्टर", s: "DC/AC वायरिंग" },
        { d: "दिन 9-10", t: "टेस्टिंग + नेट मीटर", s: "कमीशनिंग + हैंडओवर" }
      ]
    : [
        { d: "Day 1-2", t: "Site Survey & Design", s: "Shadow + structural check" },
        { d: "Day 3-5", t: "DISCOM + Order", s: "Net-meter + subsidy filed" },
        { d: "Day 6-7", t: "Structure", s: "GI rails + mounting" },
        { d: "Day 7-9", t: "Panels + Inverter", s: "DC/AC wiring + earthing" },
        { d: "Day 9-10", t: "Testing + Net Meter", s: "Commissioning + handover" }
      ];

  return (
    <ProposalJourneySection id="technical">
      <SectionHeader step={6} kicker={D["slide.technical.kicker"]} title={D["slide.technical.title"]} lang={lang} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p
          className={`text-xs text-slate-500 ${
            lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-wider"
          }`}
        >
          {D["tech.architecture"]}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6 sm:gap-3">
          {blocks.map((b, i) => (
            <div key={i} className="rounded-xl border border-sky-200 bg-sky-50/40 p-3">
              <p className="text-xs font-bold text-slate-900">{b.title}</p>
              <p className="mt-1 text-[10px] text-slate-600">{b.sub}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p
          className={`text-xs text-slate-500 ${
            lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-wider"
          }`}
        >
          {D["tech.projectPlan"]}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {stages.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">{i + 1}</span>
                <span
                  className={`text-[10px] font-bold text-slate-500 ${
                    lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-wider"
                  }`}
                >
                  {s.d}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">{s.t}</p>
              <p className="mt-1 text-[11px] text-slate-600">{s.s}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </ProposalJourneySection>
  );
}

function BomSection({ D, lang, summary }: { D: ProposalDict; lang: ProposalLang; summary: ProposalDeckSummary }) {
  return (
    <ProposalJourneySection id="bom">
      <SectionHeader step={6} kicker={D["slide.bom.kicker"]} title={D["slide.bom.title"]} lang={lang} />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th
                className={`px-3 py-2 text-left text-[10px] font-bold ${
                  lang === "hi" ? "tracking-normal" : "uppercase tracking-wider"
                }`}
              >
                #
              </th>
              <th
                className={`px-3 py-2 text-left text-[10px] font-bold ${
                  lang === "hi" ? "tracking-normal" : "uppercase tracking-wider"
                }`}
              >
                {D["bom.component"]}
              </th>
              <th
                className={`px-3 py-2 text-left text-[10px] font-bold ${
                  lang === "hi" ? "tracking-normal" : "uppercase tracking-wider"
                }`}
              >
                {D["bom.spec"]}
              </th>
              <th
                className={`px-3 py-2 text-left text-[10px] font-bold ${
                  lang === "hi" ? "tracking-normal" : "uppercase tracking-wider"
                }`}
              >
                {D["bom.brand"]}
              </th>
              <th
                className={`px-3 py-2 text-left text-[10px] font-bold ${
                  lang === "hi" ? "tracking-normal" : "uppercase tracking-wider"
                }`}
              >
                {D["bom.warranty"]}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.bom.map((b, i) => (
              <tr key={b.slot} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="px-3 py-2 text-slate-500">{b.slot}</td>
                <td className="px-3 py-2 font-bold text-slate-900">{b.title}</td>
                <td className="px-3 py-2 text-slate-700">{b.spec}</td>
                <td className="px-3 py-2 text-slate-700">{b.brand}</td>
                <td className="px-3 py-2 font-medium text-emerald-700">{b.warranty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="h-7 w-7 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-base font-bold text-emerald-900">25 {D["amc.years"]} Panel Warranty</p>
            <p className="text-[11px] text-emerald-700">{lang === "hi" ? "पैनल पर 25 साल की वारंटी" : "Performance ≥ 80% at year 25"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <Zap className="h-7 w-7 flex-shrink-0 text-sky-600" />
          <div>
            <p className="text-base font-bold text-sky-900">10 {D["amc.years"]} Inverter Warranty</p>
            <p className="text-[11px] text-sky-700">{lang === "hi" ? "स्ट्रिंग इन्वर्टर, MPPT, IP65" : "String inverter, MPPT, IP65"}</p>
          </div>
        </div>
      </div>
    </ProposalJourneySection>
  );
}

function PaymentSection({ D, summary, lang }: { D: ProposalDict; summary: ProposalDeckSummary; lang: ProposalLang }) {
  const colors = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];
  const labelKeys: Array<keyof ProposalDict> = ["pay.advance", "pay.material", "pay.installation", "pay.commissioning"];
  return (
    <ProposalJourneySection id="payment">
      <SectionHeader step={9} kicker={D["slide.payment.kicker"]} title={D["slide.payment.title"]} lang={lang} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 w-full">
          {summary.paymentMilestones.map((m, i) => (
            <div
              key={m.step}
              className={`flex items-center justify-center text-base font-bold text-white ${colors[i]}`}
              style={{ width: `${m.pct}%` }}
            >
              {m.pct}%
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {summary.paymentMilestones.map((m, i) => (
            <div key={m.step} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${colors[i]}`}>{m.step}</span>
                <span className="text-base font-bold text-slate-900">{m.pct}%</span>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-900">{D[labelKeys[i]]}</p>
              <p className="mt-1 text-base font-bold text-slate-900">{inr(m.amountInr)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
        <p className="text-sm">
          {D["commercial.gross"]}: <span className="font-bold">{inr(summary.grossSystemCost)}</span>
          {" · "}
          {D["commercial.subsidy"]}: <span className="font-bold text-emerald-300">−{inr(summary.pmSubsidy)}</span>
          {" · "}
          {D["commercial.net"]}: <span className="font-bold text-sky-300">{inr(summary.netCost)}</span>
        </p>
      </div>
    </ProposalJourneySection>
  );
}

function CommercialAndAmcSection({
  D,
  summary,
  selectedAmcYears,
  onAmcChange,
  lang
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  selectedAmcYears: 1 | 5 | 10;
  onAmcChange: (y: 1 | 5 | 10) => void;
  lang: ProposalLang;
}) {
  return (
    <ProposalJourneySection id="commercial-terms">
      <SectionHeader step={9} kicker={D["slide.commercial.kicker"]} title={D["slide.commercial.title"]} lang={lang} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{D["commercial.gross"]}</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-700">{D["commercial.gross"]}</span>
              <span className="text-base font-bold text-slate-900">{inr(summary.grossSystemCost)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-700">{D["commercial.subsidy"]}</span>
              <span className="text-base font-bold text-emerald-700">−{inr(summary.pmSubsidy)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-sky-50 p-2">
              <span className="text-sm font-bold text-sky-900">{D["commercial.net"]}</span>
              <span className="text-base font-bold text-sky-900">{inr(summary.netCost)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs italic text-emerald-700">✓ {D["commercial.gst"]}</p>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{D["slide.amc.kicker"]}</p>
          <div className="space-y-2">
            {summary.amcOptions.map((opt) => {
              const sel = opt.years === selectedAmcYears;
              return (
                <button
                  type="button"
                  key={opt.years}
                  onClick={() => onAmcChange(opt.years)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${sel ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded ${sel ? "bg-emerald-500" : "border-2 border-slate-300 bg-white"}`}>
                      {sel ? <CheckCircle2 className="h-5 w-5 text-white" /> : null}
                    </div>
                    <div>
                      <p className={`text-base font-bold ${sel ? "text-emerald-900" : "text-slate-900"}`}>
                        {opt.years} {opt.years === 1 ? D["amc.year"] : D["amc.years"]} {D["amc.option"]}
                      </p>
                      <p className="text-[11px] text-slate-600">{opt.highlights.slice(0, 2).join(" · ")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${opt.free ? "text-emerald-700" : sel ? "text-emerald-900" : "text-slate-900"}`}>
                      {opt.free ? "FREE" : inr(opt.totalInr)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ProposalJourneySection>
  );
}

function ServiceAmcSection({ D, lang, summary }: { D: ProposalDict; lang: ProposalLang; summary: ProposalDeckSummary }) {
  const includedBullets = lang === "hi"
    ? ["त्रैमासिक पैनल सफाई + विद्युत जांच", "इन्वर्टर पैरामीटर मॉनिटरिंग", "DC/AC वायरिंग सत्यापन", "अर्थिंग एवं SPD जांच", "जनरेशन रिपोर्ट हर तिमाही"]
    : ["Quarterly panel cleaning + electrical check", "Inverter parameter monitoring", "DC/AC wiring verification", "Earthing & SPD test", "Quarterly generation report"];
  const excludedBullets = lang === "hi"
    ? ["साइट पर पानी एवं विद्युत आपूर्ति", "बीमा एवं भौतिक नुकसान", "इंटरनेट कनेक्शन", "वैंडालिज्म से क्षति"]
    : ["Water + power at the site", "Insurance & physical damage", "Internet connectivity", "Vandalism damage"];
  return (
    <ProposalJourneySection id="amc">
      <SectionHeader step={8} kicker={D["slide.amc.kicker"]} title={D["slide.amc.title"]} lang={lang} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <p className="text-base font-bold text-emerald-900">{D["amc.included"]}</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {includedBullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-rose-700" />
            <p className="text-base font-bold text-rose-900">{D["amc.excluded"]}</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {excludedBullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <Gauge className="h-7 w-7 flex-shrink-0 text-sky-600" />
          <div>
            <p className="text-sm font-bold text-sky-900">{D["amc.response"]}</p>
            <p className="text-[11px] text-sky-700">
              {lang === "hi" ? "ब्रेकडाउन कॉल पर 24-48 घंटे में" : "On-site response within 24-48 hrs"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <Phone className="h-7 w-7 flex-shrink-0 text-violet-600" />
          <div>
            <p className="text-sm font-bold text-violet-900">{D["amc.escalation"]}</p>
            <p className="text-[11px] text-violet-700">{summary.contact}</p>
          </div>
        </div>
      </div>
    </ProposalJourneySection>
  );
}

function BankingSection({
  D,
  summary,
  siteImages,
  proposalId,
  lang
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  siteImages?: string[];
  proposalId: string;
  lang: ProposalLang;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // QR target priority: UPI link → public web proposal URL → none.
  // We compute the web URL lazily on the client (window.origin) so SSR works.
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  useEffect(() => {
    if (summary.upiLink) {
      setQrPayload(summary.upiLink);
      return;
    }
    if (typeof window !== "undefined") {
      setQrPayload(`${window.location.origin}/proposal/${proposalId}`);
    }
  }, [summary.upiLink, proposalId]);
  useEffect(() => {
    if (!qrPayload) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const QR = (await import("qrcode")).default;
        const dataUrl = await QR.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 600,
          color: { dark: "#0B132B", light: "#FFFFFF" }
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [qrPayload]);

  const bnk = summary.bankDetails;
  const rows = [
    { l: D["bank.accountName"], v: bnk.accountName ?? summary.installer },
    { l: D["bank.accountNumber"], v: bnk.accountNumber ?? "—" },
    { l: D["bank.ifsc"], v: bnk.ifsc ?? "—" },
    { l: D["bank.branch"], v: bnk.branch ?? "—" },
    { l: D["bank.upiId"], v: bnk.upiId ?? "—" }
  ];

  // Priority: uploaded payment QR > site photo gallery > auto-generated UPI/web QR
  const uploadedQr = bnk.paymentQrCodeUrl?.trim();
  const photos = (siteImages ?? []).filter((u) => typeof u === "string" && u.length > 0).slice(0, 6);
  const showGallery = !uploadedQr && photos.length > 0;
  const galleryTitle = lang === "hi" ? "हमारे संस्थापन" : "Recent Installations";
  const qrCaption = uploadedQr
    ? (lang === "hi" ? "भुगतान QR कोड" : "Payment QR Code")
    : summary.upiLink
      ? D["bank.scanQr"]
      : (lang === "hi" ? "वेब प्रपोजल देखने के लिए स्कैन करें" : "Scan to view this proposal online");

  return (
    <ProposalJourneySection id="banking">
      <SectionHeader step={10} kicker={D["slide.banking.kicker"]} title={D["slide.banking.title"]} lang={lang} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-slate-700" />
            <p className="text-sm font-bold text-slate-900">Bank Transfer</p>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.l} className="flex items-center justify-between py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{r.l}</span>
                <span className="text-sm font-bold text-slate-900">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
        {showGallery ? (
          <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">{galleryTitle}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {lang === "hi" ? "हमारी हाल की कुछ इंस्टॉलेशन।" : "A few of our recent rooftop installations."}
            </p>
            <div className={`mt-4 grid gap-2 ${photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {photos.map((url, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Site ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6"
          >
            <p className="text-sm font-bold text-slate-900">{qrCaption}</p>
            <div className="mt-4 flex h-60 w-60 items-center justify-center rounded-2xl bg-slate-50 p-2 shadow-inner">
              {uploadedQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploadedQr}
                  alt="Payment QR"
                  className="h-56 w-56 rounded-xl object-contain"
                />
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt={summary.upiLink ? "UPI QR" : "Web proposal QR"} className="h-52 w-52" />
              ) : (
                <span className="text-xs text-slate-400">
                  {qrPayload ? "Generating QR…" : "QR not available"}
                </span>
              )}
            </div>
            {bnk.upiId ? (
              <p className="mt-3 text-xs italic text-slate-500">{bnk.upiId}</p>
            ) : null}
            {uploadedQr && (
              <p className="mt-2 text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                Scan to Pay · High-resolution
              </p>
            )}
          </motion.div>
        )}
      </div>
      <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-800">
        🔒 GST receipt issued · RTGS / NEFT / UPI accepted
      </p>
    </ProposalJourneySection>
  );
}

// ---------------------------------------------------------------------------
// SurveyAndWorkflowSection — Page 4 (Engineering depth: site survey, shadow
// analysis, and 5-stage installation workflow). Densified for A4 printing.
// ---------------------------------------------------------------------------
function SurveyAndWorkflowSection({ D, lang, siteImages }: { D: ProposalDict; lang: ProposalLang; siteImages?: string[] }) {
  const surveyImage = siteImages?.[5] ?? siteImages?.[0];

  const surveyChecks = lang === "hi"
    ? [
        { l: "रूफ ऑरिएंटेशन", v: "दक्षिण-मुखी, 15° झुकाव" },
        { l: "उपलब्ध क्षेत्र", v: "रूफ बीम × पैनल फिटमेंट" },
        { l: "स्ट्रक्चरल लोड", v: "5 kg/m² अतिरिक्त भार" },
        { l: "शैडो विश्लेषण", v: "9AM–4PM कोई बाधा नहीं" },
        { l: "वायरिंग पथ", v: "DC < 30m, AC < 10m" },
        { l: "अर्थिंग", v: "≤ 1Ω · डबल पिट" }
      ]
    : [
        { l: "Roof Orientation", v: "South-facing, 15° tilt" },
        { l: "Available Area", v: "Roof beam × panel fitment" },
        { l: "Structural Load", v: "5 kg/m² extra dead load" },
        { l: "Shadow Analysis", v: "Clear 9 AM–4 PM" },
        { l: "Wiring Path", v: "DC < 30m, AC < 10m" },
        { l: "Earthing", v: "≤ 1Ω · double-pit" }
      ];

  const stages = lang === "hi"
    ? [
        { d: "दिन 1-2", t: "साइट सर्वे + डिज़ाइन", s: "ड्रोन सर्वे, छाया मानचित्र, स्ट्रक्चरल जांच" },
        { d: "दिन 3-5", t: "DISCOM + ऑर्डर", s: "नेट-मीटर आवेदन, सब्सिडी, सामग्री खरीद" },
        { d: "दिन 6-7", t: "स्ट्रक्चर + माउंटिंग", s: "GI रेल्स वेल्डिंग, छत-वॉटरप्रूफिंग" },
        { d: "दिन 7-9", t: "पैनल + इन्वर्टर", s: "DC/AC वायरिंग, अर्थिंग, SPD" },
        { d: "दिन 9-10", t: "टेस्टिंग + कमीशनिंग", s: "नेट-मीटर इंस्टाल, हैंडओवर" }
      ]
    : [
        { d: "Day 1–2", t: "Site Survey & Design", s: "Drone survey · shadow map · structural check" },
        { d: "Day 3–5", t: "DISCOM Filing", s: "Net-meter, subsidy, material PO" },
        { d: "Day 6–7", t: "Structure & Mounting", s: "GI rails welding · roof waterproofing" },
        { d: "Day 7–9", t: "Panels & Inverter", s: "DC/AC wiring · earthing · SPD" },
        { d: "Day 9–10", t: "Testing & Commissioning", s: "Net-meter install · handover" }
      ];

  return (
    <ProposalJourneySection id="survey">
      <SectionHeader
        step={7}
        kicker={lang === "hi" ? "सर्वे + डिज़ाइन" : "Survey · Design · Build"}
        title={lang === "hi" ? "साइट इंजीनियरिंग गहराई" : "Site Survey, Shadow Analysis & Build Workflow"}
        subtitle={lang === "hi"
          ? "हम पहले सर्वे करते हैं — पैनल बेचना नहीं। यही पेशेवर अंतर है।"
          : "We survey first — we don't sell panels. That's the engineering difference."}
        lang={lang}
      />

      {/* Top: Survey image + checklist (40/60 split) */}
      <div className="grid gap-4 sm:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.12)] sm:col-span-2"
        >
          {surveyImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={surveyImage} alt="Site survey" className="h-44 w-full object-cover sm:h-full sm:min-h-[220px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/65 via-transparent to-transparent" />
            </>
          ) : (
            <div className="flex h-44 items-center justify-center bg-gradient-to-br from-sky-100 to-emerald-100 sm:h-full sm:min-h-[220px]">
              <Compass className="h-16 w-16 text-sky-600/50" />
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">Step 0</p>
            <p className="mt-0.5 text-base font-extrabold leading-tight text-white sm:text-lg">Pre-install Site Survey</p>
            <p className="mt-1 text-[11px] text-white/85">Drone-assisted shadow + structural assessment.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm p-4 shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:col-span-3 sm:p-5"
        >
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-sky-700" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">{lang === "hi" ? "सर्वे चेकलिस्ट" : "Survey Checklist"}</p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {surveyChecks.map((c, i) => (
              <motion.div
                key={c.l}
                initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
                className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.l}</p>
                  <p className="truncate text-xs font-semibold text-slate-900">{c.v}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Shadow analysis band */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-4 grid grid-cols-3 gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-4 backdrop-blur-sm sm:p-5"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800">9 AM</p>
          <p className="mt-1 text-sm font-extrabold leading-tight text-slate-900 sm:text-base">East tilt clear</p>
          <p className="mt-0.5 text-[11px] text-slate-600">No tree/water-tank obstruction.</p>
        </div>
        <div className="border-x border-amber-200/60 px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-800">12 PM</p>
          <p className="mt-1 text-sm font-extrabold leading-tight text-slate-900 sm:text-base">Peak irradiance</p>
          <p className="mt-0.5 text-[11px] text-slate-600">~5.5 kWh/m²/day average.</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-800">4 PM</p>
          <p className="mt-1 text-sm font-extrabold leading-tight text-slate-900 sm:text-base">West tilt clear</p>
          <p className="mt-0.5 text-[11px] text-slate-600">Generation continues till sunset.</p>
        </div>
      </motion.div>

      {/* Workflow stages */}
      <div className="mt-5 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex items-center gap-2">
          <Hammer className="h-4 w-4 text-emerald-700" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">{lang === "hi" ? "स्थापना कार्यप्रवाह" : "Installation Workflow"}</p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
          {stages.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.25 + i * 0.07 }}
              className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-3 shadow-[0_2px_10px_rgba(14,165,233,0.07)]"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-[11px] font-bold text-white shadow-sm">{i + 1}</span>
                <span
                  className={`text-[10px] font-bold text-slate-500 ${
                    lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-wider"
                  }`}
                >
                  {s.d}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold leading-tight text-slate-900">{s.t}</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600">{s.s}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </ProposalJourneySection>
  );
}

function ClosingSection({
  D,
  summary,
  siteImages,
  onShare,
  onDownload,
  installer,
  downloading,
  lang,
  honoredDisplay
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  siteImages?: string[];
  onShare: () => void;
  onDownload: () => void;
  installer: { name: string; contact: string; tagline: string };
  downloading: boolean;
  lang: ProposalLang;
  honoredDisplay: string;
}) {
  const closingPhotos = [3, 4, 5]
    .map((i) => siteImages?.[i])
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0);

  return (
    <ProposalJourneySection id="closing-cta" className="proposal-closing-stage">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 p-6 text-white ring-1 ring-white/10 sm:p-10"
      >
        <p
          className={`text-xs text-emerald-200/90 ${
            lang === "hi" ? "font-bold tracking-normal" : "font-bold uppercase tracking-[0.32em]"
          }`}
        >
          {D["common.thankYou"]}
        </p>
        <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{honoredDisplay}!</h3>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">{D["slide.closing.title"]}</p>
        {closingPhotos.length > 0 ? (
          <div
            className={`mt-8 grid gap-3 ${
              closingPhotos.length === 1 ? "grid-cols-1 sm:max-w-md" : closingPhotos.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {closingPhotos.map((url, idx) => (
              <div key={`${url}-${idx}`} className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-800/80 ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Installation ${idx + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
          <CtaButton onClick={onShare} variant="secondary">
            <MessageCircle className="h-4 w-4" /> {D["cta.whatsapp"]}
          </CtaButton>
          <CtaButton onClick={onDownload} variant="ghost">
            <Download className="h-4 w-4" />
            {downloading ? "…" : D["cta.downloadPpt"]}
          </CtaButton>
          <CtaButton href={`tel:${telHrefFromInstallerContact(installer.contact)}`} variant="ghost">
            <Phone className="h-4 w-4" /> {D["cta.callUs"]}
          </CtaButton>
        </div>
      </motion.div>
      <p className="mt-8 text-center text-[11px] uppercase tracking-[0.24em] text-slate-400 proposal-journey-subtitle">
        {installer.name} · {installer.contact} · {installer.tagline}
      </p>
    </ProposalJourneySection>
  );
}

// ---------------------------------------------------------------------------
// Main page-level component
// ---------------------------------------------------------------------------

export default function ProposalView({
  id,
  customerName,
  summary,
  installer,
  siteImages,
  installerLogoUrl,
  showSurveyWorkflowSection = false,
  billAuditBacked = true
}: ProposalViewProps) {
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState<ProposalLang>(summary.lang ?? "en");
  const [selectedAmcYears, setSelectedAmcYears] = useState<1 | 5 | 10>(1);
  const [darkMode, setDarkMode] = useState(false);
  /** Prefer snapshot from DB; if missing (older proposals), fall back to this browser's saved branding. */
  const [displayInstallerLogoUrl, setDisplayInstallerLogoUrl] = useState("");

  useEffect(() => {
    const preferred = readProposalWebTheme() === "dark";
    setDarkMode(preferred);
    applyProposalRouteShellTheme(preferred ? "dark" : "light");
  }, []);

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    writeProposalWebTheme(theme);
    applyProposalRouteShellTheme(theme);
    document.documentElement.dataset.proposalTheme = theme;
  }, [darkMode]);
  const [companyGstFromBranding, setCompanyGstFromBranding] = useState(() =>
    typeof window !== "undefined" ? readProposalBrandingSettings().companyGstNumber?.trim() ?? "" : ""
  );

  useEffect(() => {
    const sync = () => {
      const branding = readProposalBrandingSettings();
      const fromServer = installerLogoUrl?.trim() ?? "";
      const fromLocal = branding.installerLogoUrl?.trim() ?? "";
      setDisplayInstallerLogoUrl(fromServer || fromLocal);
      setCompanyGstFromBranding(branding.companyGstNumber?.trim() ?? "");
    };
    sync();
    window.addEventListener(PROPOSAL_BRANDING_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PROPOSAL_BRANDING_UPDATED_EVENT, sync);
  }, [installerLogoUrl]);

  const displaySummary = useMemo(() => {
    const gst = companyGstFromBranding;
    if (gst === (summary.companyProfile.gstNumber?.trim() ?? "")) return summary;
    return {
      ...summary,
      companyProfile: { ...summary.companyProfile, gstNumber: gst }
    };
  }, [summary, companyGstFromBranding]);

  const D = dict(lang);
  const monthLbls = monthLabels(lang);
  const honoredDisplay = useMemo(
    () => (lang === "hi" ? hindiHonoredDisplayName(summary.honoredName) : summary.honoredName),
    [lang, summary.honoredName]
  );

  const whatsappText = useMemo(() => {
    const link = typeof window !== "undefined" ? `${window.location.origin}/proposal/${id}` : `/proposal/${id}`;
    if (lang === "hi") {
      return [
        `नमस्ते ${honoredDisplay} 🌞`,
        ``,
        `आपके लिए ${summary.systemKw} kW सोलर प्रस्ताव तैयार है:`,
        `• नेट लागत: ${inr(summary.netCost)} (PM सूर्य घर सब्सिडी ${inr(summary.pmSubsidy)} के बाद)`,
        `• वार्षिक बचत: ${inr(summary.annualSaving)}`,
        `• पेबैक: ${summary.paybackYears.toFixed(1)} वर्ष`,
        `• 25 वर्ष की बचत: ${inr(summary.solarVsGrid.netSaving)}`,
        ``,
        `पूरा इंटरैक्टिव प्रस्ताव: ${link}`,
        ``,
        `— ${installer.name}`
      ].join("\n");
    }
    return [
      `Namaste ${summary.honoredName} 🌞`,
      ``,
      `${summary.systemKw} kW solar proposal aapke liye taiyaar hai:`,
      `• Net cost: ${inr(summary.netCost)} (after PM Surya Ghar subsidy ${inr(summary.pmSubsidy)})`,
      `• Annual saving: ${inr(summary.annualSaving)}`,
      `• Payback: ${summary.paybackYears.toFixed(1)} yr`,
      `• 25-yr saving: ${inr(summary.solarVsGrid.netSaving)}`,
      ``,
      `Full interactive proposal: ${link}`,
      ``,
      `— ${installer.name}`
    ].join("\n");
  }, [id, summary, installer.name, lang, honoredDisplay]);

  async function downloadPpt() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/proposals/${id}/ppt?lang=${lang}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${customerName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "customer"}-proposal.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("PPT download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function shareWhatsApp() {
    if (typeof window === "undefined") return;
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Each section is wrapped in a `.proposal-page` block so it prints to its own
  // A4 page (`page-break-after: always` in @media print). On desktop the whole
  // document is constrained to A4 width (`max-w-[210mm]`) for a real "document"
  // feel; on mobile the sections stack vertically full-bleed.
  return (
    <MotionConfig transition={{ duration: 0.35, ease: "easeOut" }} reducedMotion="user">
      <div
        className={`proposal-document proposal-journey-connected proposal-responsive-doc mx-auto w-full max-w-[210mm] px-4 pb-32 pt-6 sm:px-8 sm:pt-10 print:max-w-none print:p-0 print:pb-0 transition-colors duration-300 ${
          lang === "hi" ? "lang-hi " : ""
        }${darkMode ? "text-white" : ""}`}
        data-theme={darkMode ? "dark" : "light"}
      >
      {/* Floating controls — hidden in print */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <ProposalJourneyProgress
          showSurvey={showSurveyWorkflowSection}
          billAuditBacked={billAuditBacked}
          className="flex-1 min-w-0"
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
            darkMode
              ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          {lang === "en" ? "हिन्दी" : "English"}
        </button>
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
            darkMode
              ? "border-yellow-500/50 bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {darkMode ? "Light" : "Dark"}
        </button>
        <button
          type="button"
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
            darkMode
              ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          {lang === "en" ? "Print / PDF" : "प्रिंट / PDF"}
        </button>
      </div>

      {/* PAGE 1 — COVER (Identity + customer + about + bottom-bleed image) */}
      <div className="proposal-page" data-page="cover">
        <HeroCover
          D={D}
          lang={lang}
          summary={displaySummary}
          installerLogoUrl={displayInstallerLogoUrl || undefined}
          location={undefined}
          siteImages={siteImages}
          darkMode={darkMode}
        />
      </div>

      <JourneyBridge text={journeyBridge(lang, "afterCover")} lang={lang} />

      {/* PAGE 2 — THE EXPERTISE (Domestic / Commercial / Industrial verticals) */}
      <div className="proposal-page" data-page="expertise">
        <CompanyProfileSection D={D} lang={lang} summary={displaySummary} siteImages={siteImages} />
      </div>

      <JourneyBridge text={journeyBridge(lang, "afterTrust")} lang={lang} />

      {billAuditBacked ? (
        <>
          <div className="proposal-page" data-page="bill-audit">
            <DeepAuditSection D={D} summary={displaySummary} monthLbls={monthLbls} lang={lang} />
          </div>
          <JourneyBridge text={journeyBridge(lang, "afterBill")} lang={lang} />
          <div className="proposal-page" data-page="economics">
            <EconomicsSection D={D} summary={displaySummary} monthLbls={monthLbls} lang={lang} />
          </div>
          <JourneyBridge text={journeyBridge(lang, "afterSavings")} lang={lang} />
        </>
      ) : (
        <>
          <div className="proposal-page" data-page="system-requirement">
            <SystemRequirementSection D={D} summary={displaySummary} lang={lang} />
          </div>
          <JourneyBridge text={journeyBridge(lang, "afterRequirement")} lang={lang} />
        </>
      )}

      {/* PAGE 5 — ENVIRONMENT (Carbon offset + tree-planting equivalence) */}
      <div className="proposal-page" data-page="environment">
        <EnvironmentSection D={D} summary={displaySummary} lang={lang} />
      </div>

      <JourneyBridge text={journeyBridge(lang, "afterImpact")} lang={lang} />

      {/* PAGE 6 — TECHNICAL + BOM (single high-density page, 2 sections combined) */}
      <div className="proposal-page" data-page="technical-bom">
        <TechnicalProposalSection D={D} lang={lang} summary={displaySummary} />
        <BomSection D={D} lang={lang} summary={displaySummary} />
      </div>

      <JourneyBridge
        text={journeyBridge(lang, showSurveyWorkflowSection ? "afterSystem" : "afterInstall")}
        lang={lang}
      />

      {/* PAGE 7 — Survey & workflow (only after CRM marks site survey complete) */}
      {showSurveyWorkflowSection ? (
        <div className="proposal-page" data-page="survey">
          <SurveyAndWorkflowSection D={D} lang={lang} siteImages={siteImages} />
        </div>
      ) : null}

      {showSurveyWorkflowSection ? (
        <JourneyBridge text={journeyBridge(lang, "afterInstall")} lang={lang} />
      ) : null}

      {/* PAGE 8 — AMC SERVICE (Aftercare detail) */}
      <div className="proposal-page" data-page="amc">
        <ServiceAmcSection D={D} lang={lang} summary={displaySummary} />
      </div>

      <JourneyBridge text={journeyBridge(lang, "afterSupport")} lang={lang} />

      {/* PAGE 9 — COMMERCIAL (Payment plan + Commercial terms combined) */}
      <div className="proposal-page" data-page="commercial">
        <PaymentSection D={D} summary={displaySummary} lang={lang} />
        <CommercialAndAmcSection
          D={D}
          summary={displaySummary}
          selectedAmcYears={selectedAmcYears}
          onAmcChange={setSelectedAmcYears}
          lang={lang}
        />
      </div>

      <JourneyBridge text={journeyBridge(lang, "afterPay")} lang={lang} />

      {/* PAGE 10 — THE CLOSING (Banking + Thank You combined; QR perfectly visible) */}
      <div className="proposal-page" data-page="closing">
        <BankingSection D={D} summary={displaySummary} siteImages={siteImages} proposalId={id} lang={lang} />
        <ClosingSection
          D={D}
          summary={displaySummary}
          siteImages={siteImages}
          onShare={shareWhatsApp}
          onDownload={downloadPpt}
          installer={installer}
          downloading={downloading}
          lang={lang}
          honoredDisplay={honoredDisplay}
        />
      </div>

      {/* Sticky bottom action bar — mobile only, hidden in print */}
      <motion.div
        className={`fixed bottom-0 left-0 right-0 z-30 border-t px-4 py-3 backdrop-blur sm:hidden print:hidden ${
          darkMode ? "border-white/10 bg-slate-950/95" : "border-slate-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow active:scale-95"
          >
            <MessageCircle className="h-4 w-4" /> {D["cta.whatsapp"]}
          </button>
          <button
            type="button"
            onClick={downloadPpt}
            disabled={downloading}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm active:scale-95"
          >
            <Download className="h-4 w-4" /> {downloading ? "…" : D["cta.downloadPpt"]}
          </button>
        </div>
      </motion.div>
      </div>
    </MotionConfig>
  );
}
