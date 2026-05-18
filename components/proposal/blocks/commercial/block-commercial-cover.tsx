"use client";

/**
 * BlockCommercialCover — cinematic executive cover for commercial proposals.
 *
 * Design language: deep slate-950 foundation, sky-400 accent, white on dark.
 * Presentation feel: Bloomberg terminal meets Stripe billing — data-dense but breathable.
 *
 * Elements:
 *   - Full-height dark canvas with animated radial glow + grid overlay
 *   - Header bar: installer brand + date + confidential badge
 *   - "COMMERCIAL SOLAR INTELLIGENCE REPORT" eyebrow
 *   - Giant customer name (focal point, 6xl–8xl)
 *   - Location + system type metadata
 *   - System specification badge with capacity
 *   - KPI bottom ribbon with CountUp animated numbers
 */

import { motion } from "framer-motion";
import { Building2, CalendarDays, FileText, MapPin, Zap } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";
import { CountUp } from "./commercial-shared";

const fmtInrL = (v: number) => {
  if (v >= 10_000_000) return { int: (v / 10_000_000).toFixed(1), unit: "Cr" };
  if (v >= 100_000) return { int: (v / 100_000).toFixed(1), unit: "L" };
  if (v >= 1_000) return { int: (v / 1_000).toFixed(0), unit: "k" };
  return { int: Math.round(v).toLocaleString("en-IN"), unit: "" };
};

type Props = { ctx: CommercialCtx };

export function BlockCommercialCover({ ctx }: Props) {
  const {
    summary,
    installer,
    installerLogoUrl,
    customerName,
    generatedAt,
    roiPct,
    profit25,
    lang,
  } = ctx;

  const isHi = lang === "hi";

  const dateStr = generatedAt
    ? new Date(generatedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const savingFmt = fmtInrL(summary.annualSaving);
  const costFmt = fmtInrL(summary.netCost);
  const profitFmt = fmtInrL(profit25);

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950"
      style={{ fontFamily: "inherit" }}
    >
      {/* ── Ambient radial glow ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[70vh] w-[70vw] rounded-full bg-sky-900/15 blur-[100px]" />
        <div className="absolute right-0 bottom-0 h-[40vh] w-[40vw] rounded-full bg-indigo-900/10 blur-[80px]" />
      </div>

      {/* ── Micro-grid overlay ──────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* ── Diagonal accent band ────────────────────────────────────── */}
      <div className="pointer-events-none absolute -left-48 top-0 h-[65vh] w-[75vw] -rotate-[11deg] bg-gradient-to-br from-sky-900/25 via-indigo-900/12 to-transparent" />

      {/* ── Bottom gradient fade ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-slate-900/80 to-transparent" />

      {/* ── Header bar ──────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between border-b border-white/8 px-6 py-4 md:px-12 md:py-5"
      >
        {/* Installer brand */}
        <div className="flex items-center gap-3">
          {installerLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={installerLogoUrl}
              alt={installer.name}
              className="h-8 w-auto object-contain brightness-200"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600/40 to-indigo-600/30 ring-1 ring-sky-500/30">
              <Zap className="h-4.5 w-4.5 text-sky-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">{installer.name}</p>
            {installer.tagline && (
              <p className="text-[10px] text-slate-500">{installer.tagline}</p>
            )}
          </div>
        </div>

        {/* Right: date + confidential */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1.5 sm:flex">
            <CalendarDays className="h-3 w-3 text-slate-600" />
            <span className="text-[11px] font-medium text-slate-500">{dateStr}</span>
          </div>
          <span className="rounded border border-slate-700/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
            Confidential
          </span>
        </div>
      </motion.header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 py-14 md:px-12 md:py-20">
        {/* Report eyebrow */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mb-7 flex items-center gap-3"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/20 ring-1 ring-sky-500/30">
            <FileText className="h-3 w-3 text-sky-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">
            {isHi ? "व्यावसायिक सौर प्रस्ताव" : "Commercial Solar Intelligence Report"}
          </span>
        </motion.div>

        {/* "PREPARED FOR" micro-label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500"
        >
          {isHi ? "के लिए तैयार किया गया" : "Prepared For"}
        </motion.p>

        {/* Customer name — cinematic focal point */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 max-w-4xl text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          style={{ textShadow: "0 4px 32px rgba(14,165,233,0.15)" }}
        >
          {customerName || summary.honoredName}
        </motion.h1>

        {/* Location + installation type */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="mb-10 flex flex-wrap items-center gap-5"
        >
          {ctx.pptInput.location ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-sm font-medium text-slate-400">{ctx.pptInput.location}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-sm font-medium text-slate-400">
              {isHi ? "ऑन-ग्रिड वाणिज्यिक सौर" : "On-Grid Commercial Solar"}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
            {isHi ? "गोपनीय" : "Strictly Confidential"}
          </span>
        </motion.div>

        {/* System capacity badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.48 }}
          className="inline-flex items-center gap-4 self-start rounded-xl border border-sky-500/25 bg-sky-950/60 px-6 py-4 backdrop-blur-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 ring-1 ring-sky-500/25">
            <Zap className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-white">
              {summary.systemKw} kW
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-sky-400/80">
              {summary.panels} {isHi ? "पैनल" : "panels"} ·{" "}
              {(summary.annualGen / 1000).toFixed(1)} MWh/yr ·{" "}
              {Math.round(summary.coverage)}%{isHi ? " लोड कवरेज" : " coverage"}
            </p>
          </div>
        </motion.div>

        {/* KPI preview divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.62 }}
          className="mt-14 flex items-center gap-4"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-600">
            {isHi ? "मुख्य संकेतक" : "Key Performance Indicators"}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>
      </main>

      {/* ── KPI ribbon ───────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/8 bg-slate-900/70 backdrop-blur-sm">
        <div className="grid grid-cols-2 divide-x divide-white/8 sm:grid-cols-3 lg:grid-cols-5">
          {/* Annual saving */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68 }}
            className="flex flex-col gap-1 px-5 py-5 md:py-6"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {isHi ? "वार्षिक बचत" : "Annual Saving"}
            </span>
            <span className="text-2xl font-black tabular-nums text-white md:text-3xl">
              ₹<CountUp target={parseFloat(savingFmt.int)} decimals={savingFmt.int.includes(".") ? 1 : 0} />
              <span className="ml-0.5 text-base font-bold text-slate-400">{savingFmt.unit}</span>
            </span>
            <span className="text-[10px] text-slate-600">{isHi ? "प्रति वर्ष" : "per year"}</span>
          </motion.div>

          {/* Net investment */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.74 }}
            className="flex flex-col gap-1 px-5 py-5 md:py-6"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {isHi ? "शुद्ध निवेश" : "Net Investment"}
            </span>
            <span className="text-2xl font-black tabular-nums text-white md:text-3xl">
              ₹<CountUp target={parseFloat(costFmt.int)} decimals={costFmt.int.includes(".") ? 1 : 0} />
              <span className="ml-0.5 text-base font-bold text-slate-400">{costFmt.unit}</span>
            </span>
            <span className="text-[10px] text-slate-600">{isHi ? "subsidy के बाद" : "post-subsidy"}</span>
          </motion.div>

          {/* Payback */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.80 }}
            className="flex flex-col gap-1 px-5 py-5 md:py-6"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {isHi ? "पेबैक अवधि" : "Payback Period"}
            </span>
            <span className="text-2xl font-black tabular-nums text-white md:text-3xl">
              <CountUp target={summary.paybackYears} decimals={1} suffix=" yr" />
            </span>
            <span className="text-[10px] text-slate-600">{isHi ? "ब्रेक-ईवन" : "break-even"}</span>
          </motion.div>

          {/* Annualised ROI */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.86 }}
            className="flex flex-col gap-1 px-5 py-5 md:py-6"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {isHi ? "25 वर्ष ROI" : "25-Year ROI"}
            </span>
            <span className="text-2xl font-black tabular-nums text-sky-400 md:text-3xl">
              <CountUp target={roiPct} decimals={1} suffix="%" />
            </span>
            <span className="text-[10px] text-slate-600">{isHi ? "वार्षिक" : "annualised"}</span>
          </motion.div>

          {/* 25-year profit */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.92 }}
            className="flex flex-col gap-1 px-5 py-5 md:py-6"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {isHi ? "25 वर्ष लाभ" : "25-Year Profit"}
            </span>
            <span className="text-2xl font-black tabular-nums text-emerald-400 md:text-3xl">
              ₹<CountUp target={parseFloat(profitFmt.int)} decimals={profitFmt.int.includes(".") ? 1 : 0} />
              <span className="ml-0.5 text-base font-bold text-emerald-600">{profitFmt.unit}</span>
            </span>
            <span className="text-[10px] text-slate-600">{isHi ? "शुद्ध लाभ" : "net profit"}</span>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
