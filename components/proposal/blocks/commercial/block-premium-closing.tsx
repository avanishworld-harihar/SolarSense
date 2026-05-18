"use client";

/**
 * BlockPremiumClosing — premium closing page for commercial solar proposals.
 *
 * Elements:
 *   - Executive decision summary (headline KPIs)
 *   - "Why act now" — cost of delay calculation
 *   - Acceptance section with signature area
 *   - Installer contact card
 *   - Share / Download CTAs
 */

import { motion } from "framer-motion";
import { Download, Mail, Phone, Share2, Zap } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{num}</span>
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-600">{label}</span>
    </div>
  );
}

const fmtL = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)} k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

type Props = { ctx: CommercialCtx };

export function BlockPremiumClosing({ ctx }: Props) {
  const {
    summary,
    installer,
    installerLogoUrl,
    proposalId,
    roiPct,
    irr,
    breakEvenYear,
    profit25,
    lang,
    downloading,
    onDownload,
    onShare,
  } = ctx;
  const isHi = lang === "hi";

  // Cost of delay — every month without solar = monthly saving lost
  const monthlySaving = Math.round(summary.annualSaving / 12);
  const delayLoss3Months = monthlySaving * 3;

  const decisonSummary = [
    {
      label: isHi ? "शुद्ध निवेश" : "Net Investment",
      value: fmtL(summary.netCost),
      sub: isHi ? "subsidy के बाद" : "post-subsidy",
    },
    {
      label: isHi ? "वार्षिक बचत" : "Annual Saving",
      value: fmtL(summary.annualSaving),
      sub: isHi ? "पहले वर्ष से" : "from year one",
    },
    {
      label: isHi ? "ब्रेक-ईवन" : "Break-Even",
      value: `${breakEvenYear} yr`,
      sub: isHi ? "पूर्ण वापसी" : "full recovery",
    },
    {
      label: isHi ? "25yr ROI" : "25-Year ROI",
      value: `${roiPct}%`,
      sub: isHi ? "वार्षिक" : "annualised",
    },
    {
      label: isHi ? "IRR (अनुमानित)" : "IRR (est.)",
      value: `${irr}%`,
      sub: isHi ? "आंतरिक रिटर्न" : "internal rate",
    },
    {
      label: isHi ? "25yr लाभ" : "25-Year Profit",
      value: fmtL(profit25),
      sub: isHi ? "शुद्ध लाभ" : "net profit",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <SectionLabel num="10" label={isHi ? "प्रस्ताव स्वीकृति" : "Closing & Acceptance"} />

      {/* Decision summary banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8 overflow-hidden rounded-xl bg-slate-950"
      >
        <div className="border-b border-white/10 px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {isHi ? "कार्यकारी निर्णय सारांश" : "Executive Decision Summary"}
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {summary.systemKw} kW {isHi ? "ऑन-ग्रिड सौर प्रणाली" : "On-Grid Solar System"} —{" "}
            {ctx.customerName}
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-3 lg:grid-cols-6">
          {decisonSummary.map((d, i) => (
            <div key={i} className="px-4 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">{d.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{d.value}</p>
              <p className="text-[9px] text-slate-600">{d.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Cost of delay */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="mb-8 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-6 py-5"
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
          {isHi ? "विलंब की लागत" : "Cost of Delay"}
        </p>
        <p className="text-sm font-medium text-amber-900">
          {isHi
            ? `हर महीने जो सौर स्थापित नहीं है, वह `
            : `Every month without solar costs `}
          <span className="font-bold">{fmtL(monthlySaving)}</span>
          {isHi ? ` की ऊर्जा बचत गंवाना है।` : ` in foregone savings.`}
        </p>
        <p className="mt-1 text-sm text-amber-800">
          {isHi
            ? `3 महीने की देरी = `
            : `A 3-month delay = `}
          <span className="font-bold">{fmtL(delayLoss3Months)}</span>
          {isHi ? ` की हानि।` : ` lost permanently.`}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Acceptance section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            {isHi ? "प्रस्ताव स्वीकृति" : "Proposal Acceptance"}
          </p>
          <p className="mb-6 text-sm text-slate-600">
            {isHi
              ? "इस प्रस्ताव को स्वीकार करके, आप ऊपर वर्णित EPC दायरे और व्यावसायिक शर्तों से सहमत होते हैं।"
              : "By accepting this proposal, you agree to the EPC scope and commercial terms described above. Work order to be issued to proceed."}
          </p>

          {/* Signature blocks */}
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: isHi ? "ग्राहक हस्ताक्षर" : "Client Signature", sub: isHi ? "नाम एवं पदनाम" : "Name & Designation" },
              { label: isHi ? "EPC अधिकृत हस्ताक्षर" : "EPC Authorised Signatory", sub: installer.name },
            ].map((sig, i) => (
              <div key={i}>
                <div className="mb-2 h-12 rounded-md border border-dashed border-slate-300" />
                <p className="text-[10px] font-semibold text-slate-600">{sig.label}</p>
                <p className="text-[10px] text-slate-400">{sig.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              { label: isHi ? "दिनांक" : "Date" },
              { label: isHi ? "स्थान" : "Place" },
            ].map((field) => (
              <div key={field.label}>
                <div className="mb-1 h-8 rounded-md border border-dashed border-slate-300" />
                <p className="text-[10px] text-slate-400">{field.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[10px] text-slate-400">
            {isHi
              ? `प्रस्ताव संदर्भ: ${proposalId?.slice(0, 8)?.toUpperCase() ?? "—"}`
              : `Proposal Ref: ${proposalId?.slice(0, 8)?.toUpperCase() ?? "—"}`}
          </p>
        </div>

        {/* Installer contact card + CTA */}
        <div className="flex flex-col gap-4">
          {/* Contact card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {isHi ? "अपने EPC भागीदार से संपर्क करें" : "Contact Your EPC Partner"}
            </p>
            <div className="flex items-start gap-4">
              {installerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={installerLogoUrl}
                  alt={installer.name}
                  className="h-12 w-auto rounded object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100">
                  <Zap className="h-6 w-6 text-sky-600" />
                </div>
              )}
              <div>
                <p className="text-base font-bold text-slate-900">{installer.name}</p>
                {installer.tagline && (
                  <p className="text-xs text-slate-500">{installer.tagline}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {installer.contact && (
                <a
                  href={`tel:${installer.contact}`}
                  className="flex items-center gap-2 text-sm text-slate-700 hover:text-sky-700"
                >
                  <Phone className="h-4 w-4 text-slate-400" />
                  {installer.contact}
                </a>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Mail className="h-4 w-4 text-slate-400" />
                {isHi ? "ईमेल के लिए संपर्क करें" : "Contact for email"}
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {isHi ? "इस प्रस्ताव को साझा करें" : "Share This Proposal"}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onShare}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Share2 className="h-4 w-4" />
                {isHi ? "लिंक कॉपी करें" : "Copy Proposal Link"}
              </button>
              <button
                onClick={onDownload}
                disabled={downloading}
                className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {downloading
                  ? (isHi ? "डाउनलोड हो रहा है..." : "Preparing...")
                  : (isHi ? "PDF डाउनलोड करें" : "Download as PDF")}
              </button>
            </div>
          </div>

          {/* Environmental note */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800">
          {isHi
              ? `यह ${summary.systemKw} kW सिस्टम 25 वर्षों में ${summary.environmental.lifetimeCo2TonsSaved} टन CO₂ बचाएगा।`
              : `This ${summary.systemKw} kW system will offset ${summary.environmental.lifetimeCo2TonsSaved} tonnes of CO₂ over 25 years.`}
            </p>
            <p className="mt-0.5 text-[10px] text-emerald-600">
              {isHi
                ? `${summary.environmental.treeEquivalent} पेड़ों के बराबर।`
                : `Equivalent to planting ${summary.environmental.treeEquivalent} trees.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
