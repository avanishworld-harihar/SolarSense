"use client";

/**
 * BlockTieredBOM — professional tiered Bill of Materials for commercial proposals.
 *
 * Categories:
 *   1. PV Generation Equipment (modules, inverter)
 *   2. Balance of System (BOS) — cables, conduit, connectors
 *   3. Civil & Structural Works
 *   4. Electrical & Protection
 *   5. Monitoring & Commissioning
 *
 * Columns: Item | Specification | Make / Standard | Qty | Unit | Warranty
 * Footer: total project value with cost breakup by category
 *
 * Phase B enhancement:
 *   - DCR vs NON-DCR panel pricing shown when dcrComparison is enabled
 *   - Inverter phase (single / three phase) shown in inverter row
 */

import { motion } from "framer-motion";
import { ListChecks, Scale, ArrowRightLeft } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";
import { CommercialSectionHeader, GlassPanel, SectionReveal } from "./commercial-shared";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import { PANEL_CATALOG } from "@/lib/commercial-panel-catalog";

const fmtL = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)} k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

type BomRow = {
  item: string;
  spec: string;
  make: string;
  qty: string;
  unit: string;
  warranty: string;
};

type BomCategory = {
  id: string;
  label: string;
  labelHi?: string;
  color: string;
  rows: BomRow[];
  costShare: number; // approximate % of total cost
};

function buildBom(
  systemKw: number,
  panels: number,
  panelBrand: string,
  inverterBrand: string,
  inverterPhase: "single" | "three" = "three",
  panelWatt = 540,
): BomCategory[] {
  const strings = Math.ceil(panels / 14);
  const inverterCount = Math.max(1, Math.ceil(systemKw / 50));
  const phaseLabel = inverterPhase === "single" ? "Single-phase" : "Three-phase";
  const panelSpec = `${panelWatt} Wp Mono PERC Half-cut, η ≥ ${(panelWatt / 2590 * 100).toFixed(1)}%`;

  return [
    {
      id: "generation",
      label: "PV Generation Equipment",
      labelHi: "PV जनरेशन उपकरण",
      color: "sky",
      costShare: 62,
      rows: [
        {
          item: "Solar PV Modules",
          spec: panelSpec,
          make: panelBrand || "Tier-1 ALMM-listed",
          qty: `${panels}`,
          unit: "nos",
          warranty: "25 yr linear",
        },
        {
          item: `String Inverter (${phaseLabel})`,
          spec: `${systemKw} kW on-grid, ${phaseLabel}, MPPT, IP65, LCD`,
          make: inverterBrand || "IEC 62109",
          qty: `${inverterCount}`,
          unit: "nos",
          warranty: "5 yr standard",
        },
      ],
    },
    {
      id: "bos",
      label: "Balance of System (BOS)",
      labelHi: "बैलेंस ऑफ सिस्टम (BOS)",
      color: "amber",
      costShare: 12,
      rows: [
        {
          item: "Solar DC Cable (4 mm²)",
          spec: "TÜV 2Pfg 1169, UV-rated, 1 kV",
          make: "Polycab / Havells",
          qty: `${Math.round(systemKw * 8)}`,
          unit: "metres",
          warranty: "25 yr UV",
        },
        {
          item: "AC Power Cable (16 mm²)",
          spec: "XLPE armoured, IS 1554",
          make: "Finolex / KEI",
          qty: `${Math.round(systemKw * 4)}`,
          unit: "metres",
          warranty: "10 yr",
        },
        {
          item: "MC4 Connectors",
          spec: "IP68, TÜV certified, UV-stable",
          make: "Stäubli / Amphenol",
          qty: `${strings * 4}`,
          unit: "pairs",
          warranty: "25 yr",
        },
        {
          item: "Cable Management (HDPE conduit)",
          spec: "25 mm / 40 mm IS 9537, UV-rated",
          make: "Finolex / Sudhakar",
          qty: "As per layout",
          unit: "lot",
          warranty: "10 yr",
        },
      ],
    },
    {
      id: "civil",
      label: "Civil & Structural Works",
      labelHi: "सिविल एवं संरचना कार्य",
      color: "violet",
      costShare: 10,
      rows: [
        {
          item: "Module Mounting Structure",
          spec: "Hot-dip galvanised MS, wind-load designed",
          make: "IS 2062, zinc ≥ 85 µm",
          qty: `${systemKw} kW`,
          unit: "capacity",
          warranty: "10 yr structural",
        },
        {
          item: "Foundation / Anchor bolts",
          spec: "M12/M16 SS 304, chemical anchor",
          make: "Hilti / Fischer equiv.",
          qty: `${panels * 2} approx`,
          unit: "nos",
          warranty: "10 yr",
        },
        {
          item: "Cable Tray / Ladder",
          spec: "GI 2.0 mm perforated, IS 2062",
          make: "ABB / Legrand equiv.",
          qty: "As per layout",
          unit: "lot",
          warranty: "10 yr",
        },
      ],
    },
    {
      id: "electrical",
      label: "Electrical & Protection",
      labelHi: "विद्युत एवं सुरक्षा",
      color: "rose",
      costShare: 10,
      rows: [
        {
          item: "DCDB (DC Distribution Box)",
          spec: "IP54, DC MCB + fuse + SPD Type 2",
          make: "Havells / Schneider",
          qty: `${inverterCount}`,
          unit: "nos",
          warranty: "1 yr",
        },
        {
          item: "ACDB (AC Distribution Box)",
          spec: "IP54, MCB + RCCB + SPD + energy meter",
          make: "Havells / Schneider",
          qty: `${inverterCount}`,
          unit: "nos",
          warranty: "1 yr",
        },
        {
          item: "Earthing System",
          spec: "IS 3043 — 4-electrode GI pipe, 3 m deep",
          make: "Copper-bonded / GI",
          qty: "4 nos",
          unit: "electrodes",
          warranty: "Lifetime",
        },
        {
          item: "Lightning Arrestor",
          spec: "IEC 62305 — Class I/II, roof-mount",
          make: "OBO Bettermann / equiv.",
          qty: "1 set",
          unit: "lot",
          warranty: "5 yr",
        },
      ],
    },
    {
      id: "monitoring",
      label: "Monitoring & Commissioning",
      labelHi: "मॉनिटरिंग एवं कमीशनिंग",
      color: "emerald",
      costShare: 6,
      rows: [
        {
          item: "Smart Monitoring Device",
          spec: "IoT data logger, Wi-Fi + Ethernet",
          make: "Inverter OEM cloud portal",
          qty: "1",
          unit: "lot",
          warranty: "2 yr",
        },
        {
          item: "Net Energy Meter (NEM)",
          spec: "Bi-directional, CT/PT type per DISCOM spec",
          make: "DISCOM approved make",
          qty: "1",
          unit: "nos",
          warranty: "DISCOM owned",
        },
        {
          item: "Commissioning & Testing",
          spec: "IV curve · insulation test · IS/IEC 62446 report",
          make: "In-house certified engineers",
          qty: "1",
          unit: "lot",
          warranty: "N/A",
        },
        {
          item: "DISCOM Net-Metering Approval",
          spec: "Application + inspection + meter install support",
          make: "EPC scope",
          qty: "1",
          unit: "application",
          warranty: "N/A",
        },
      ],
    },
  ];
}

const catColorClasses: Record<string, { header: string; dot: string }> = {
  sky: { header: "bg-sky-700", dot: "bg-sky-500" },
  amber: { header: "bg-amber-700", dot: "bg-amber-500" },
  violet: { header: "bg-violet-700", dot: "bg-violet-500" },
  rose: { header: "bg-rose-700", dot: "bg-rose-500" },
  emerald: { header: "bg-emerald-700", dot: "bg-emerald-500" },
};

type Props = { ctx: CommercialCtx };

export function BlockTieredBOM({ ctx }: Props) {
  const { summary, lang, pptInput } = ctx;
  const isHi = lang === "hi";
  const cc: CommercialProposalConfig | null | undefined = pptInput.commercialConfig;

  // Resolve active panel config from commercialConfig
  const activeCatalogEntry = cc?.panel?.catalogId
    ? PANEL_CATALOG.find((p) => p.id === cc.panel!.catalogId) ?? null
    : null;
  const panelWatt = cc?.panel?.watt ?? activeCatalogEntry?.watt ?? 540;
  const inverterPhase = (cc as { inverterPhase?: "single" | "three" } | null | undefined)
    ?.inverterPhase ?? "three";

  // DCR comparison data
  const dcrEnabled = cc?.dcrComparison?.enabled !== false;
  const dcrEntry = PANEL_CATALOG.find(
    (p) => p.panelType === "DCR" && (p.brandId === (cc?.panel?.brandId ?? "waaree"))
  );
  const nonDcrEntry = PANEL_CATALOG.find(
    (p) => p.panelType === "NON_DCR" && (p.brandId === (cc?.panel?.brandId ?? "waaree"))
  );
  const dcrRate = cc?.panel?.ratePerWpInr ?? dcrEntry?.ratePerWpInr ?? 42;
  const nonDcrRate = nonDcrEntry?.ratePerWpInr ?? dcrRate - 4;
  const dcrDelta = dcrRate - nonDcrRate;
  const dcrCost = dcrRate * panelWatt * summary.panels;
  const nonDcrCost = nonDcrRate * panelWatt * summary.panels;

  const categories = buildBom(
    summary.systemKw,
    summary.panels,
    summary.brands.panel,
    summary.brands.inverter,
    inverterPhase,
    panelWatt,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12 md:py-24">
      <CommercialSectionHeader
        num="06"
        label={isHi ? "सामग्री सूची" : "Bill of Materials"}
        title={isHi ? "स्तरीय सामग्री सूची" : "Tiered Bill of Materials"}
        subtitle={
          isHi
            ? "EPC आपूर्ति और स्थापना दायरे की संपूर्ण सूची — सभी श्रेणियां"
            : "Complete EPC supply-and-install scope — all categories with specifications, makes, and warranties"
        }
      />

      {/* Cost distribution bar */}
      <SectionReveal>
        <GlassPanel className="p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          {isHi ? "लागत वितरण (अनुमानित)" : "Approximate Cost Distribution"}
        </p>
        <div className="mb-3 flex h-4 overflow-hidden rounded-full">
          {categories.map((cat) => {
            const c = catColorClasses[cat.color];
            return (
              <div
                key={cat.id}
                className={`${c.header} transition-all`}
                style={{ width: `${cat.costShare}%` }}
                title={`${cat.label}: ${cat.costShare}%`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {categories.map((cat) => {
            const c = catColorClasses[cat.color];
            const label = isHi && cat.labelHi ? cat.labelHi : cat.label;
            return (
              <div key={cat.id} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${c.dot}`} />
                <span className="text-[10px] text-slate-600">
                  {label} — {cat.costShare}%
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          {isHi
            ? `कुल परियोजना लागत: ${fmtL(summary.grossSystemCost)} (subsidy के बाद: ${fmtL(summary.netCost)})`
            : `Total project value: ${fmtL(summary.grossSystemCost)} · Net after subsidy: ${fmtL(summary.netCost)}`}
        </p>
        </GlassPanel>
      </SectionReveal>

      {/* ── DCR vs NON-DCR panel pricing comparison ────────────────────────── */}
      {dcrEnabled && (
        <SectionReveal>
          <div className="mt-6 rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-4 w-4 text-sky-600" />
              <p className="text-sm font-bold text-slate-800">
                {isHi ? "DCR बनाम Non-DCR पैनल मूल्य तुलना" : "DCR vs Non-DCR Panel Pricing"}
              </p>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                {summary.panels} modules · {panelWatt}W
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* DCR card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  DCR Panel
                </p>
                <p className="text-[10px] text-slate-500">ALMM listed · Subsidy eligible</p>
                <p className="mt-2 text-xl font-extrabold text-slate-900">
                  ₹{dcrRate.toFixed(1)}<span className="text-xs font-semibold text-slate-500">/Wp</span>
                </p>
                <p className="text-[11px] font-semibold text-emerald-700">
                  ₹{(dcrCost / 100000).toFixed(2)} L total
                </p>
                <div className="mt-1.5 rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  PM Surya Ghar subsidy applicable
                </div>
              </div>

              {/* NON-DCR card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Non-DCR Panel
                </p>
                <p className="text-[10px] text-slate-400">Import / non-ALMM</p>
                <p className="mt-2 text-xl font-extrabold text-slate-900">
                  ₹{nonDcrRate.toFixed(1)}<span className="text-xs font-semibold text-slate-500">/Wp</span>
                </p>
                <p className="text-[11px] font-semibold text-slate-600">
                  ₹{(nonDcrCost / 100000).toFixed(2)} L total
                </p>
                <div className="mt-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                  No subsidy · Lower upfront cost
                </div>
              </div>
            </div>

            {/* Delta row */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-xs font-bold text-amber-800">
                  {isHi ? "DCR प्रीमियम" : "DCR Premium"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-amber-700">
                  +₹{dcrDelta.toFixed(1)}/Wp
                </p>
                <p className="text-[10px] text-amber-600">
                  +₹{((dcrCost - nonDcrCost) / 1000).toFixed(0)}k total · offset by subsidy benefit
                </p>
              </div>
            </div>
          </div>
        </SectionReveal>
      )}

      {/* BOM tables by category */}
      <div className="mt-6 space-y-4">
        {categories.map((cat, catIdx) => {
          const c = catColorClasses[cat.color];
          const label = isHi && cat.labelHi ? cat.labelHi : cat.label;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIdx * 0.05 }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)]"
            >
              {/* Category header */}
              <div className={`flex items-center gap-2 px-5 py-3 ${c.header}`}>
                <span className={`h-2 w-2 rounded-full bg-white/60`} />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                  {label}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-2 text-left">{isHi ? "आइटम" : "Item"}</th>
                      <th className="px-5 py-2 text-left">{isHi ? "विशिष्टता" : "Specification"}</th>
                      <th className="px-5 py-2 text-left">{isHi ? "ब्रांड / मानक" : "Make / Standard"}</th>
                      <th className="px-5 py-2 text-right">{isHi ? "मात्रा" : "Qty"}</th>
                      <th className="px-5 py-2 text-right">{isHi ? "इकाई" : "Unit"}</th>
                      <th className="px-5 py-2 text-right">{isHi ? "वारंटी" : "Warranty"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={`border-b border-slate-100 ${rowIdx % 2 === 1 ? "bg-slate-50/50" : ""}`}
                      >
                        <td className="px-5 py-2 font-medium text-slate-800">{row.item}</td>
                        <td className="px-5 py-2 text-slate-600">{row.spec}</td>
                        <td className="px-5 py-2 text-slate-500">{row.make}</td>
                        <td className="px-5 py-2 text-right tabular-nums text-slate-700">{row.qty}</td>
                        <td className="px-5 py-2 text-right text-slate-500">{row.unit}</td>
                        <td className="px-5 py-2 text-right text-emerald-700">{row.warranty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-4">
        <ListChecks className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          {isHi
            ? "यह BOM अनुमानित स्पेसिफिकेशन है। अंतिम BOM साइट सर्वे और डिज़ाइन के बाद प्रदान किया जाएगा। ब्रांड समकक्ष विकल्प पूर्व-अनुमोदन के साथ प्रयोग किए जा सकते हैं।"
            : "This BOM reflects indicative specifications. Final BOM will be provided post site survey and detailed design. Equivalent brand substitutions may be used with prior written approval."}
        </p>
      </div>
    </div>
  );
}
