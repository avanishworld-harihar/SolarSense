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
 */

import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";
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

function buildBom(systemKw: number, panels: number, panelBrand: string, inverterBrand: string): BomCategory[] {
  const strings = Math.ceil(panels / 14);
  const inverterCount = Math.max(1, Math.ceil(systemKw / 50)); // 1 inverter up to 50kW

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
          spec: `540 Wp Mono PERC Half-cut, η ≥ 20.9%`,
          make: panelBrand || "Tier-1 ALMM-listed",
          qty: `${panels}`,
          unit: "nos",
          warranty: "25 yr linear",
        },
        {
          item: "String Inverter",
          spec: `${systemKw} kW on-grid, MPPT, IP65, LCD`,
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
  const { summary, lang } = ctx;
  const isHi = lang === "hi";

  const categories = buildBom(
    summary.systemKw,
    summary.panels,
    summary.brands.panel,
    summary.brands.inverter
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <SectionLabel num="06" label={isHi ? "सामग्री सूची" : "Bill of Materials"} />

      <div className="mb-3">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {isHi ? "स्तरीय सामग्री सूची" : "Tiered Bill of Materials"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isHi
            ? "EPC आपूर्ति और स्थापना दायरे की संपूर्ण सूची — सभी श्रेणियां"
            : "Complete EPC supply-and-install scope — all categories with specifications, makes, and warranties"}
        </p>
      </div>

      {/* Cost distribution bar */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
      </div>

      {/* BOM tables by category */}
      <div className="mt-5 space-y-4">
        {categories.map((cat, catIdx) => {
          const c = catColorClasses[cat.color];
          const label = isHi && cat.labelHi ? cat.labelHi : cat.label;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIdx * 0.06 }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
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
