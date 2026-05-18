"use client";

/**
 * CommercialProposalView — the executive-grade commercial proposal rendering experience.
 *
 * Route: /proposal/[id] when preset_id = "commercial_executive"
 *
 * Architecture:
 *   - Self-contained: manages its own state (lang, downloading)
 *   - Derives all commercial metrics from ProposalDeckSummary + PremiumProposalPptInput
 *   - Renders 10 premium sections sequentially
 *   - Sticky dark top-nav with section jumpers
 *   - Mobile + iPad responsive
 *
 * Does NOT use ProposalWebRenderer or the block registry.
 * This is a purpose-built executive renderer for the commercial_executive preset.
 */

import { useCallback, useState } from "react";
import { MotionConfig } from "framer-motion";
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

// ─── Shared context type ─────────────────────────────────────────────────────

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

// ─── Sticky navigation sections ──────────────────────────────────────────────

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

function scrollToSection(anchor: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(anchor);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Props ───────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

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
  const performanceRatio = 78; // typical India on-grid PR
  const lcoe =
    summary.netCost > 0 && summary.annualGen > 0
      ? Math.round((summary.netCost / (summary.annualGen * 25)) * 100) / 100
      : 0;

  // 25-year escalated cashflow
  const cashflow25: { year: number; saving: number; cumulative: number }[] = [];
  let cumulative = -summary.netCost;
  let annualSaving = summary.annualSaving;
  for (let yr = 1; yr <= 25; yr++) {
    cumulative += annualSaving;
    cashflow25.push({
      year: yr,
      saving: Math.round(annualSaving),
      cumulative: Math.round(cumulative),
    });
    annualSaving *= 1.06;
  }
  const breakEvenYear =
    cashflow25.find((r) => r.cumulative >= 0)?.year ?? Math.round(summary.paybackYears);
  const profit25 = cashflow25[24]?.cumulative ?? summary.lifetime25Profit;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    setDownloading(true);
    // PPT download reuses the same endpoint as ProposalView
    if (typeof window !== "undefined") {
      window.open(`/api/proposals/${id}/ppt`, "_blank");
    }
    setTimeout(() => setDownloading(false), 3000);
  }, [id]);

  const handleShare = useCallback(() => {
    if (typeof navigator === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${customerName} — Solar Proposal`, url }).catch(() => undefined);
    } else {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
  }, [customerName]);

  // ── Build context object ──────────────────────────────────────────────────

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
    onDownload: handleDownload,
    onShare: handleShare,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="commercial-proposal min-h-screen font-sans antialiased"
        style={{ colorScheme: "light" }}
      >
        {/* ── Sticky dark navigation bar ───────────────────────────────── */}
        <nav className="sticky top-0 z-50 hidden border-b border-white/10 bg-slate-950/97 backdrop-blur-sm md:block">
          <div className="flex items-center overflow-x-auto">
            <div className="flex shrink-0 items-center border-r border-white/10 px-4 py-2.5">
              <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
                COMMERCIAL PROPOSAL
              </span>
            </div>
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.anchor}
                onClick={() => scrollToSection(s.anchor)}
                className="group flex shrink-0 flex-col items-center gap-0.5 px-3.5 py-2.5 transition-colors hover:bg-white/5"
              >
                <span className="text-[8px] font-bold text-slate-600 group-hover:text-sky-400">
                  {s.num}
                </span>
                <span className="whitespace-nowrap text-[10px] font-medium text-slate-400 group-hover:text-slate-200">
                  {s.label}
                </span>
              </button>
            ))}
            <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-white/10 px-3 py-1.5">
              <button
                onClick={() => setLang(lang === "en" ? "hi" : "en")}
                className="rounded px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
              >
                {lang === "en" ? "हिंदी" : "EN"}
              </button>
            </div>
          </div>
        </nav>

        {/* ── Section 01 — Executive Cover (full-height dark page) ─────── */}
        <section id="comm-cover">
          <BlockCommercialCover ctx={ctx} />
        </section>

        {/* ── White content area ───────────────────────────────────────── */}
        <div className="bg-white">
          {/* Section 02 — ROI Dashboard */}
          <section id="comm-roi" className="border-b border-slate-100">
            <BlockROIDashboard ctx={ctx} />
          </section>

          {/* Section 03 — Financial Intelligence */}
          <section id="comm-financials" className="border-b border-slate-100">
            <BlockCommercialFinancials ctx={ctx} />
          </section>

          {/* Section 04 — Engineering Rationale */}
          <section id="comm-engineering" className="border-b border-slate-100">
            <BlockCommercialEngineering ctx={ctx} />
          </section>

          {/* Section 05 — System Architecture */}
          <section id="comm-architecture" className="border-b border-slate-100">
            <BlockSystemArchitecture ctx={ctx} />
          </section>

          {/* Section 06 — Tiered BOM */}
          <section id="comm-bom" className="border-b border-slate-100">
            <BlockTieredBOM ctx={ctx} />
          </section>

          {/* Section 07 — Execution Timeline */}
          <section id="comm-timeline" className="border-b border-slate-100">
            <BlockExecutionTimeline ctx={ctx} />
          </section>

          {/* Section 08 — Monitoring + AMC */}
          <section id="comm-monitoring" className="border-b border-slate-100">
            <BlockMonitoringAMC ctx={ctx} />
          </section>

          {/* Section 09 — Commercial Terms */}
          <section id="comm-terms" className="border-b border-slate-100">
            <BlockCommercialTerms ctx={ctx} />
          </section>

          {/* Section 10 — Premium Closing */}
          <section id="comm-closing" className="pb-20">
            <BlockPremiumClosing ctx={ctx} />
          </section>
        </div>

        {/* ── Mobile nav FAB (bottom-right) ───────────────────────────── */}
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 md:hidden">
          <button
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/90 shadow-lg backdrop-blur"
            aria-label="Share"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>
    </MotionConfig>
  );
}
