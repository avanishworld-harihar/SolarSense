"use client";

/**
 * CommercialProposalView — executive-grade commercial proposal rendering.
 *
 * Route: /proposal/[id] when preset_id = "commercial_executive"
 *
 * Architecture:
 *   - Derives all commercial metrics from ProposalDeckSummary + PremiumProposalPptInput
 *   - Renders 10 premium sections sequentially
 *   - Sticky dark top-nav with active-section tracking + section jumpers
 *   - Presentation mode: fullscreen immersive walkthrough
 *   - Alternate section backgrounds for visual rhythm
 *   - Floating progress indicator on desktop
 *   - Mobile + iPad responsive
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Download,
  Expand,
  Minimize,
  Maximize2,
  Share2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ProposalDeckSummary, PremiumProposalPptInput } from "@/lib/proposal-ppt";
import type { ProposalLang } from "@/lib/proposal-i18n";

// Section blocks
import { BlockCommercialCover } from "./blocks/commercial/block-commercial-cover";
import { BlockROIDashboard } from "./blocks/commercial/block-roi-dashboard";
import { BlockCommercialFinancials } from "./blocks/commercial/block-commercial-financials";
import { BlockCommercialEngineering } from "./blocks/commercial/block-commercial-engineering";
import { BlockSystemArchitecture } from "./blocks/commercial/block-system-architecture";
import { BlockTieredBOM } from "./blocks/commercial/block-tiered-bom";
import { BlockExecutionTimeline } from "./blocks/commercial/block-execution-timeline";
import { BlockMonitoringAMC } from "./blocks/commercial/block-monitoring-amc";
import { BlockCommercialTerms } from "./blocks/commercial/block-commercial-terms";
import { BlockPremiumClosing } from "./blocks/commercial/block-premium-closing";
import { BlockDcrComparison } from "./blocks/commercial/block-dcr-comparison";
import { BlockCapacityScenarios } from "./blocks/commercial/block-capacity-scenarios";
import { BlockCommercialFinancing } from "./blocks/commercial/block-commercial-financing";
import { HotelEnergyStory } from "./blocks/hotel/hotel-energy-story";

// ─── Shared context ───────────────────────────────────────────────────────────

export type CommercialCtx = {
  summary: ProposalDeckSummary;
  pptInput: PremiumProposalPptInput;
  installer: { name: string; contact: string; tagline: string };
  installerLogoUrl?: string;
  siteImages?: string[];
  proposalId: string;
  customerName: string;
  generatedAt: string;
  // Derived commercial metrics
  roiPct: number;
  irr: number;
  dcCapacityKwp: number;
  dcAcRatio: number;
  capacityFactor: number;
  specificYield: number;
  performanceRatio: number;
  lcoe: number;
  cashflow25: { year: number; saving: number; cumulative: number }[];
  breakEvenYear: number;
  profit25: number;
  // State
  lang: ProposalLang;
  downloading: boolean;
  onDownload: () => void;
  onShare: () => void;
};

// ─── Navigation sections ──────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { num: "01", label: "Executive", anchor: "comm-cover" },
  { num: "02", label: "ROI", anchor: "comm-roi" },
  { num: "03", label: "Financials", anchor: "comm-financials" },
  { num: "04", label: "Engineering", anchor: "comm-engineering" },
  { num: "05", label: "Architecture", anchor: "comm-architecture" },
  { num: "06", label: "BOM", anchor: "comm-bom" },
  { num: "07", label: "Timeline", anchor: "comm-timeline" },
  { num: "08", label: "Monitoring", anchor: "comm-monitoring" },
  { num: "09", label: "Terms", anchor: "comm-terms" },
  { num: "10", label: "Closing", anchor: "comm-closing" },
] as const;

type SectionAnchor = (typeof NAV_SECTIONS)[number]["anchor"];

function scrollToSection(anchor: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(anchor);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Section background alternation ──────────────────────────────────────────
// Cover is always dark-navy. Sections alternate white / very-light-slate.

const SECTION_BG = [
  "", // cover — dark, handled by block itself
  "bg-white",
  "bg-slate-50/70",
  "bg-white",
  "bg-slate-50/70",
  "bg-white",
  "bg-slate-50/70",
  "bg-white",
  "bg-slate-50/70",
  "bg-white",
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export type CommercialProposalViewProps = {
  id: string;
  customerName: string;
  generatedAt: string;
  summary: ProposalDeckSummary;
  pptInput: PremiumProposalPptInput;
  installer: { name: string; contact: string; tagline: string };
  siteImages?: string[];
  installerLogoUrl?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommercialProposalView({
  id,
  customerName,
  generatedAt,
  summary,
  pptInput,
  installer,
  siteImages,
  installerLogoUrl,
}: CommercialProposalViewProps) {
  const [lang, setLang] = useState<ProposalLang>(summary.lang ?? "en");
  const [downloading, setDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionAnchor>("comm-cover");
  const [presentMode, setPresentMode] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── Active-section tracking via IntersectionObserver ─────────────────────
  useEffect(() => {
    const sections = NAV_SECTIONS.map((s) => document.getElementById(s.anchor)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionAnchor);
          }
        }
      },
      { threshold: 0.25, rootMargin: "-10% 0px -60% 0px" }
    );
    sections.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // ── Presentation-mode keyboard navigation ─────────────────────────────────
  useEffect(() => {
    if (!presentMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setPresentIdx((i) => Math.min(i + 1, NAV_SECTIONS.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setPresentIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Escape") {
        setPresentMode(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentMode]);

  // Scroll to active section in presentation mode
  useEffect(() => {
    if (!presentMode) return;
    scrollToSection(NAV_SECTIONS[presentIdx].anchor);
  }, [presentMode, presentIdx]);

  // ── Derived commercial metrics ────────────────────────────────────────────

  const roiPct =
    summary.netCost > 0
      ? Math.round((summary.annualSaving / summary.netCost) * 100 * 10) / 10
      : 0;

  const irr =
    summary.paybackYears > 0
      ? Math.round((72 / summary.paybackYears) * 10) / 10
      : 0;

  const PANEL_WATT = 540;
  const dcCapacityKwp = (summary.panels * PANEL_WATT) / 1000;
  const dcAcRatio =
    summary.systemKw > 0
      ? Math.round((dcCapacityKwp / summary.systemKw) * 100) / 100
      : 1.1;
  const capacityFactor =
    summary.systemKw > 0
      ? Math.round((summary.annualGen / (summary.systemKw * 8760)) * 100 * 10) / 10
      : 0;
  const specificYield =
    summary.systemKw > 0
      ? Math.round(summary.annualGen / summary.systemKw)
      : 0;
  const performanceRatio = 78;
  const lcoe =
    summary.netCost > 0 && summary.annualGen > 0
      ? Math.round((summary.netCost / (summary.annualGen * 25)) * 100) / 100
      : 0;

  // 25-year escalated cashflow (6% tariff escalation)
  const cashflow25: { year: number; saving: number; cumulative: number }[] = [];
  let cumulative = -summary.netCost;
  let annualSaving = summary.annualSaving;
  for (let yr = 1; yr <= 25; yr++) {
    cumulative += annualSaving;
    cashflow25.push({ year: yr, saving: Math.round(annualSaving), cumulative: Math.round(cumulative) });
    annualSaving *= 1.06;
  }
  const breakEvenYear =
    cashflow25.find((r) => r.cumulative >= 0)?.year ?? Math.round(summary.paybackYears);
  const profit25 = cashflow25[24]?.cumulative ?? summary.lifetime25Profit;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDownloadPpt = useCallback(() => {
    setDownloading(true);
    if (typeof window !== "undefined") {
      window.open(`/api/proposals/${id}/ppt`, "_blank");
    }
    setTimeout(() => setDownloading(false), 3000);
  }, [id]);

  const handleDownloadPdf = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  const handleShare = useCallback(() => {
    if (typeof navigator === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${customerName} — Solar Proposal`, url }).catch(() => undefined);
    } else {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
  }, [customerName]);

  // ── Context object ────────────────────────────────────────────────────────

  const ctx: CommercialCtx = {
    summary,
    pptInput,
    installer,
    installerLogoUrl,
    siteImages,
    proposalId: id,
    customerName,
    generatedAt,
    roiPct,
    irr,
    dcCapacityKwp,
    dcAcRatio,
    capacityFactor,
    specificYield,
    performanceRatio,
    lcoe,
    cashflow25,
    breakEvenYear,
    profit25,
    lang,
    downloading,
    onDownload: handleDownloadPpt,
    onShare: handleShare,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="commercial-proposal proposal-document mx-auto min-h-screen max-w-[210mm] font-sans antialiased print:max-w-none"
        style={{ colorScheme: "light" }}
      >

        {/* ── Sticky dark navigation bar ──────────────────────────────── */}
        <AnimatePresence>
          {!presentMode && (
            <motion.nav
              key="sticky-nav"
              initial={{ y: -56 }}
              animate={{ y: 0 }}
              exit={{ y: -56 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/97 backdrop-blur-md"
            >
              <div className="flex items-center">
                {/* Brand cell */}
                <div className="hidden shrink-0 items-center gap-2 border-r border-white/8 px-4 py-2.5 md:flex">
                  <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
                    SOL.52 COMMERCIAL
                  </span>
                </div>

                {/* Section nav — scrollable */}
                <div className="flex flex-1 overflow-x-auto">
                  {NAV_SECTIONS.map((s) => {
                    const isActive = activeSection === s.anchor;
                    return (
                      <button
                        key={s.anchor}
                        onClick={() => scrollToSection(s.anchor)}
                        className={`group relative flex shrink-0 flex-col items-center gap-0.5 px-3.5 py-2.5 transition-colors ${
                          isActive ? "bg-white/6" : "hover:bg-white/4"
                        }`}
                      >
                        <span
                          className={`text-[8px] font-bold transition-colors ${
                            isActive ? "text-sky-400" : "text-slate-600 group-hover:text-sky-500"
                          }`}
                        >
                          {s.num}
                        </span>
                        <span
                          className={`whitespace-nowrap text-[10px] font-medium transition-colors ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        >
                          {s.label}
                        </span>
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="nav-active"
                            className="absolute bottom-0 inset-x-0 h-[2px] bg-sky-400"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right controls */}
                <div className="flex shrink-0 items-center gap-1 border-l border-white/8 px-2 py-1.5">
                  {/* Language toggle */}
                  <button
                    onClick={() => setLang(lang === "en" ? "hi" : "en")}
                    className="rounded px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
                  >
                    {lang === "en" ? "हिंदी" : "EN"}
                  </button>
                  {/* Presentation mode */}
                  <button
                    onClick={() => { setPresentMode(true); setPresentIdx(0); }}
                    title="Presentation mode"
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
                  >
                    <Expand className="h-3 w-3" />
                    <span className="hidden sm:inline">Present</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="hidden items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200 sm:inline-flex print:hidden"
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        {/* ── Presentation-mode overlay bar ────────────────────────────── */}
        <AnimatePresence>
          {presentMode && (
            <motion.div
              key="present-bar"
              initial={{ y: -48 }}
              animate={{ y: 0 }}
              exit={{ y: -48 }}
              className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-white/8 bg-slate-950/98 px-4 py-2 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  PRESENTATION MODE
                </span>
                <span className="text-[10px] text-slate-600">
                  {presentIdx + 1} / {NAV_SECTIONS.length} · {NAV_SECTIONS[presentIdx].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPresentIdx((i) => Math.max(i - 1, 0))}
                  disabled={presentIdx === 0}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPresentIdx((i) => Math.min(i + 1, NAV_SECTIONS.length - 1))}
                  disabled={presentIdx === NAV_SECTIONS.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPresentMode(false)}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floating vertical progress bar (desktop) ─────────────────── */}
        <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-1.5 xl:flex">
          {NAV_SECTIONS.map((s, i) => {
            const isActive = activeSection === s.anchor;
            return (
              <button
                key={s.anchor}
                onClick={() => scrollToSection(s.anchor)}
                title={s.label}
                className="group flex items-center gap-2"
              >
                <span className={`hidden text-[9px] font-bold transition-all group-hover:block ${isActive ? "text-sky-400" : "text-slate-400"}`}>
                  {s.label}
                </span>
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isActive
                      ? "h-5 w-2 bg-sky-400"
                      : "h-1.5 w-1.5 bg-slate-300 hover:bg-slate-500"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* ── Section 01 — Cover (full-height dark) ────────────────────── */}
        <section id="comm-cover" className="proposal-page">
          <BlockCommercialCover ctx={ctx} />
        </section>

        {/* ── Optional C&I intelligence blocks (from commercialConfig) ─── */}
        {pptInput.commercialConfig?.dcrComparison?.enabled !== false ? (
          <section id="comm-dcr" className="proposal-page border-b border-slate-100/80 bg-slate-50/70">
            <BlockDcrComparison
              summary={summary}
              lang={lang}
              darkMode={false}
              commercialConfig={pptInput.commercialConfig}
            />
          </section>
        ) : null}
        {pptInput.commercialConfig?.capacityScenarios?.enabled !== false ? (
          <section id="comm-scenarios" className="proposal-page border-b border-slate-100/80 bg-white">
            <BlockCapacityScenarios
              summary={summary}
              lang={lang}
              darkMode={false}
              commercialConfig={pptInput.commercialConfig}
            />
          </section>
        ) : null}

        {/* ── Hotel Energy Story — only for hotel org type ──────────────── */}
        {pptInput.commercialConfig?.orgType === "hotel" && (
          <section id="comm-hotel-story" className="bg-slate-950">
            <HotelEnergyStory
              systemKw={summary.systemKw}
              annualSavingsInr={summary.annualSaving}
              netCostInr={summary.netCost}
              paybackYears={summary.paybackYears}
              annualGenerationKwh={summary.systemKw * 1450}
            />
          </section>
        )}

        {/* ── Content sections — alternating white/light backgrounds ───── */}
        <div>
          {(
            [
              { anchor: "comm-roi", idx: 1, Block: BlockROIDashboard },
              { anchor: "comm-financials", idx: 2, Block: BlockCommercialFinancials },
              { anchor: "comm-engineering", idx: 3, Block: BlockCommercialEngineering },
              { anchor: "comm-architecture", idx: 4, Block: BlockSystemArchitecture },
              { anchor: "comm-bom", idx: 5, Block: BlockTieredBOM },
              { anchor: "comm-timeline", idx: 6, Block: BlockExecutionTimeline },
              { anchor: "comm-monitoring", idx: 7, Block: BlockMonitoringAMC },
              { anchor: "comm-terms", idx: 8, Block: BlockCommercialTerms },
              { anchor: "comm-closing", idx: 9, Block: BlockPremiumClosing },
            ] as const
          ).map(({ anchor, idx, Block }) => (
            <section
              key={anchor}
              id={anchor}
              className={`proposal-page ${SECTION_BG[idx]} border-b border-slate-100/80 last:border-0`}
            >
              <Block ctx={ctx} />
              {anchor === "comm-financials" && pptInput.commercialConfig?.financing?.enabled ? (
                <BlockCommercialFinancing
                  summary={summary}
                  lang={lang}
                  darkMode={false}
                  commercialConfig={pptInput.commercialConfig}
                />
              ) : null}
            </section>
          ))}
        </div>

        {/* ── Mobile FAB ───────────────────────────────────────────────── */}
        <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2 md:hidden">
          {/* Mobile section nav toggle */}
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/98 py-2 shadow-2xl backdrop-blur-md"
            >
              {NAV_SECTIONS.map((s) => (
                <button
                  key={s.anchor}
                  onClick={() => { scrollToSection(s.anchor); setMobileNavOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
                >
                  <span className="text-[9px] font-bold text-slate-500">{s.num}</span>
                  <span className="text-xs font-medium text-slate-300">{s.label}</span>
                </button>
              ))}
            </motion.div>
          )}

          {/* Menu toggle */}
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 shadow-lg backdrop-blur"
          >
            {mobileNavOpen ? (
              <X className="h-4 w-4 text-white" />
            ) : (
              <Maximize2 className="h-4 w-4 text-white" />
            )}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600/90 shadow-lg backdrop-blur"
          >
            <Share2 className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Minimal bottom padding */}
        <div className="h-20" />
      </div>
    </MotionConfig>
  );
}
