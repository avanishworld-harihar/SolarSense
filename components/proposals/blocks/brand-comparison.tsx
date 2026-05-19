"use client";

/**
 * BrandComparisonCard — Wave 3 P7.
 *
 * Block ID: brand_comparison_card
 * Preset: commercial_executive (optional — off by default)
 *
 * Side-by-side comparison of panel + inverter brands with key specs.
 * Local-only data from lib/brand-metadata.ts — no marketplace coupling.
 * Block ID is stable and never changes.
 */

import { motion } from "framer-motion";
import { Award, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import {
  BlockPanel,
  BlockSectionTitle,
} from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";
import {
  getTopPanelBrands,
  getTopInverterBrands,
  type PanelBrandSpec,
  type InverterBrandSpec,
} from "@/lib/brand-metadata";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "darkMode">;

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier, dark }: { tier: string; dark: boolean }) {
  const colors =
    tier === "tier1"
      ? dark
        ? "bg-emerald-900/50 text-emerald-300 border-emerald-700"
        : "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tier === "tier2"
      ? dark
        ? "bg-blue-900/50 text-blue-300 border-blue-700"
        : "bg-blue-50 text-blue-700 border-blue-200"
      : dark
      ? "bg-slate-800 text-slate-400 border-slate-700"
      : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${colors}`}>
      {tier.toUpperCase()}
    </span>
  );
}

function PanelRow({ brand, dark, isHi }: { brand: PanelBrandSpec; dark: boolean; isHi: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className={`flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-start sm:gap-4 ${
        dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
      }`}
    >
      {/* Brand header */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
            {brand.name}
          </span>
          <TierBadge tier={brand.tier} dark={dark} />
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
              dark ? "border-amber-700 bg-amber-900/40 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {brand.badge}
          </span>
        </div>
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {isHi ? brand.descriptionHi : brand.description}
        </p>
      </div>

      {/* Spec pills */}
      <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end sm:gap-1">
        <SpecPill label={isHi ? "दक्षता" : "Efficiency"} value={`${brand.efficiency}%`} dark={dark} />
        <SpecPill label={isHi ? "तकनीक" : "Tech"} value={brand.technology} dark={dark} />
        <SpecPill label={isHi ? "वारंटी" : "Warranty"} value={`${brand.performanceWarrantyYears}yr perf`} dark={dark} />
      </div>
    </motion.div>
  );
}

function InverterRow({ brand, dark, isHi }: { brand: InverterBrandSpec; dark: boolean; isHi: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className={`flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-start sm:gap-4 ${
        dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
            {brand.name}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
              dark
                ? "border-violet-700 bg-violet-900/40 text-violet-300"
                : "border-violet-200 bg-violet-50 text-violet-700"
            }`}
          >
            {brand.inverterType}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
              dark ? "border-amber-700 bg-amber-900/40 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {brand.badge}
          </span>
        </div>
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {isHi ? brand.descriptionHi : brand.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end sm:gap-1">
        <SpecPill label={isHi ? "दक्षता" : "Efficiency"} value={`${brand.efficiency}%`} dark={dark} />
        <SpecPill
          label={isHi ? "रेंज" : "Range"}
          value={`${brand.powerRangeKw[0]}–${brand.powerRangeKw[1]} kW`}
          dark={dark}
        />
        <SpecPill label={isHi ? "वारंटी" : "Warranty"} value={`${brand.warrantyYears}yr`} dark={dark} />
      </div>
    </motion.div>
  );
}

function SpecPill({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${
        dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
      }`}
    >
      <span className={`text-[9px] uppercase tracking-widest ${dark ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </span>
      <span className={`text-[11px] font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function BrandComparisonCard({ summary, lang, darkMode }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;

  // Use BOM override brand name to highlight matched brand; fall back to top 3.
  const panelBrands = getTopPanelBrands(3);
  const inverterBrands = getTopInverterBrands(3);

  const kicker = isHi ? "ब्रांड तुलना" : "Brand Comparison";
  const title = isHi
    ? "अनुशंसित पैनल एवं इन्वर्टर ब्रांड"
    : "Recommended Panel & Inverter Brands";
  const subtitle = isHi
    ? "सभी ब्रांड Tier-1 वर्गीकृत — BIS प्रमाणित — 25+ वर्ष प्रदर्शन"
    : "All brands Tier-1 rated · BIS certified · 25+ year performance track record";

  return (
    <ProposalJourneySection id="brand-comparison">
      <BlockSectionTitle kicker={kicker} title={title} subtitle={subtitle} dark={dark} lang={lang} />

      {/* Trust indicators */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { icon: <ShieldCheck className="h-3 w-3" />, label: isHi ? "BIS सर्टिफाइड" : "BIS Certified" },
          { icon: <CheckCircle2 className="h-3 w-3" />, label: isHi ? "25+ वर्ष ट्रैक रिकॉर्ड" : "25+ yr Track Record" },
          { icon: <Award className="h-3 w-3" />, label: isHi ? "वैश्विक Tier-1" : "Global Tier-1" },
          { icon: <Zap className="h-3 w-3" />, label: isHi ? "उच्च दक्षता" : "High Efficiency" },
        ].map((badge) => (
          <div
            key={badge.label}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              dark
                ? "border-white/10 bg-white/5 text-slate-300"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span className={dark ? "text-emerald-400" : "text-emerald-600"}>{badge.icon}</span>
            {badge.label}
          </div>
        ))}
      </div>

      {/* Panels section */}
      <BlockPanel dark={dark} className="mb-4">
        <p
          className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            dark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {isHi ? "सोलर पैनल" : "Solar Panels"} · {summary.panels}×{" "}
          {isHi ? "मॉड्यूल" : "modules"} · {summary.brands.panel || "Tier-1"}
        </p>
        <div className="flex flex-col gap-2.5">
          {panelBrands.map((brand) => (
            <PanelRow key={brand.id} brand={brand} dark={dark} isHi={isHi} />
          ))}
        </div>
      </BlockPanel>

      {/* Inverters section */}
      <BlockPanel dark={dark}>
        <p
          className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            dark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {isHi ? "इन्वर्टर / PCU" : "Inverter / PCU"} · {summary.systemKw} kW ·{" "}
          {summary.brands.inverter || "String Inverter"}
        </p>
        <div className="flex flex-col gap-2.5">
          {inverterBrands.map((brand) => (
            <InverterRow key={brand.id} brand={brand} dark={dark} isHi={isHi} />
          ))}
        </div>
      </BlockPanel>
    </ProposalJourneySection>
  );
}
