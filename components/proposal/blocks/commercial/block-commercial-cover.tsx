"use client";

/**
 * BlockCommercialCover — Executive cover page for commercial solar proposals.
 *
 * Design: deep navy / slate-950 background, white typography, sky-400 accents.
 * Institutional feel — closer to an EPC feasibility report than a brochure.
 *
 * Key elements:
 *   - Issuer + date header bar
 *   - "COMMERCIAL SOLAR INTELLIGENCE REPORT" heading
 *   - Customer org name (focal point)
 *   - System specification badge
 *   - 4-metric bottom ribbon (saving, net cost, payback, 25yr profit)
 *   - Subtle geometric accent lines
 */

import { motion } from "framer-motion";
import { Building2, CalendarDays, FileText, MapPin, Zap } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";

const fmtInrL = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)} k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
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

  const ribbonMetrics = [
    {
      label: isHi ? "वार्षिक बचत" : "Annual Saving",
      value: fmtInrL(summary.annualSaving),
      sub: isHi ? "प्रति वर्ष" : "per year",
    },
    {
      label: isHi ? "शुद्ध निवेश" : "Net Investment",
      value: fmtInrL(summary.netCost),
      sub: isHi ? "subsidy के बाद" : "post-subsidy",
    },
    {
      label: isHi ? "पेबैक अवधि" : "Payback Period",
      value: `${summary.paybackYears} yr`,
      sub: isHi ? "ब्रेक-ईवन" : "break-even",
    },
    {
      label: isHi ? "25 वर्ष ROI" : "25-Year ROI",
      value: `${roiPct}%`,
      sub: isHi ? "वार्षिक" : "annualised",
    },
    {
      label: isHi ? "25 वर्ष लाभ" : "25-Year Profit",
      value: fmtInrL(profit25),
      sub: isHi ? "शुद्ध लाभ" : "net profit",
    },
  ];

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950"
      style={{ fontFamily: "inherit" }}
    >
      {/* Subtle geometric grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Diagonal accent band */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[60vh] w-[70vw] -rotate-12 bg-gradient-to-br from-sky-900/20 via-indigo-900/10 to-transparent" />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-8 py-5 md:px-12">
        <div className="flex items-center gap-3">
          {installerLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={installerLogoUrl}
              alt={installer.name}
              className="h-8 w-auto object-contain brightness-200"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-sky-600/30">
              <Zap className="h-4 w-4 text-sky-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">{installer.name}</p>
            {installer.tagline && (
              <p className="text-[10px] text-slate-500">{installer.tagline}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1.5 sm:flex">
            <CalendarDays className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-xs font-medium text-slate-500">{dateStr}</span>
          </div>
          <span className="rounded border border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
            Confidential
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 flex-col justify-center px-8 py-12 md:px-12 md:py-16">
        {/* Report type label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex items-center gap-3"
        >
          <FileText className="h-4 w-4 text-sky-500" />
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-500">
            {isHi ? "व्यावसायिक सौर प्रस्ताव" : "Commercial Solar Intelligence Report"}
          </span>
        </motion.div>

        {/* Customer name — focal point */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-4"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {isHi ? "के लिए तैयार किया गया" : "Prepared For"}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            {customerName || summary.honoredName}
          </h1>
        </motion.div>

        {/* Location + tariff */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mb-10 flex flex-wrap items-center gap-4"
        >
          {ctx.pptInput.location ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-sm text-slate-400">{ctx.pptInput.location}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-sm text-slate-400">
              {isHi ? "ऑन-ग्रिड वाणिज्यिक सौर" : "On-Grid Commercial Solar"}
            </span>
          </div>
        </motion.div>

        {/* System specification badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mb-12 inline-flex items-center gap-3 self-start rounded-lg border border-sky-500/30 bg-sky-950/50 px-5 py-3 backdrop-blur-sm"
        >
          <Zap className="h-5 w-5 text-sky-400" />
          <div>
            <p className="text-xl font-bold tabular-nums text-white">
              {summary.systemKw} kW
            </p>
            <p className="text-[10px] text-sky-400/80">
              {summary.panels} {isHi ? "पैनल" : "panels"} ·{" "}
              {(summary.annualGen / 1000).toFixed(1)} MWh/yr ·{" "}
              {Math.round(summary.coverage)}%{isHi ? " लोड कवरेज" : " load coverage"}
            </p>
          </div>
        </motion.div>

        {/* Horizontal rule with section label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="mb-2 flex items-center gap-3"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-white/5 via-white/20 to-transparent" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
            {isHi ? "मुख्य संकेतक" : "Key Performance Indicators"}
          </span>
        </motion.div>
      </main>

      {/* KPI ribbon — pinned to bottom */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-900/80 backdrop-blur-sm">
        <div className="grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-3 md:grid-cols-5">
          {ribbonMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.07 }}
              className="flex flex-col gap-0.5 px-5 py-4"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {m.label}
              </span>
              <span className="text-xl font-bold tabular-nums text-white md:text-2xl">
                {m.value}
              </span>
              <span className="text-[10px] text-slate-600">{m.sub}</span>
            </motion.div>
          ))}
        </div>
      </footer>
    </div>
  );
}
