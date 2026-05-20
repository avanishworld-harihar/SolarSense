"use client";

/**
 * Guided requirement-based residential builder — compact, homeowner-friendly.
 */

import { NumericTextInput } from "@/components/ui/numeric-text-input";
import { cn } from "@/lib/utils";
import {
  estimateResidentialEmiInr,
  moduleCountForResidential,
  quoteResidentialSolar,
} from "@/lib/residential-solar-engine";
import {
  RESIDENTIAL_BRAND_PRESETS,
  RESIDENTIAL_WATT_PRESETS,
  type ResidentialProposalConfig,
} from "@/lib/residential-requirements-schema";
import { PANEL_CATALOG } from "@/lib/commercial-panel-catalog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Battery,
  Building2,
  Calculator,
  IndianRupee,
  Layers,
  Leaf,
  Sun,
  Zap,
} from "lucide-react";

type Props = {
  config: ResidentialProposalConfig;
  onChange: (next: ResidentialProposalConfig) => void;
  netCostInr: number;
  annualSavingInr: number;
  className?: string;
};

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all touch-manipulation",
        active
          ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
      )}
    >
      {children}
    </button>
  );
}

export function ResidentialRequirementBuilder({ config, onChange, netCostInr, annualSavingInr, className }: Props) {
  const solar = config.solar;
  const quote = quoteResidentialSolar(solar);
  const modules = moduleCountForResidential(solar);
  const fin = config.financing ?? { enabled: true, interestRatePct: 10.5, selectedTenureYears: 5 };
  const emi = fin.enabled
    ? estimateResidentialEmiInr(netCostInr, fin.interestRatePct ?? 10.5, fin.selectedTenureYears ?? 5)
    : 0;
  const monthlySaving = Math.round(annualSavingInr / 12);

  function patch(partial: Partial<ResidentialProposalConfig>) {
    onChange({ ...config, ...partial });
  }

  function patchSolar(partial: Partial<typeof solar>) {
    onChange({ ...config, solar: { ...solar, ...partial } });
  }

  function applyBrandPreset(brandId: string, brand: string, watt: number) {
    const track = solar.panelTrack === "dcr" ? "DCR" : "NON_DCR";
    const hit = PANEL_CATALOG.find((e) => e.brandId === brandId && e.watt === watt && e.panelType === track);
    patchSolar({
      brandId,
      brand,
      watt,
      technology: hit?.technology,
      ratePerWpInr: hit?.ratePerWpInr ?? solar.ratePerWpInr,
      moduleCountOverride: undefined,
    });
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/40 p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-[#0f1419] dark:to-amber-950/20 sm:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
          <Sun className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Requirement-based · Guided
          </p>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Build your home solar story</h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            No bill needed — we size from your inputs and generate a homeowner-friendly proposal.
          </p>
        </div>
      </div>

      {/* Live summary strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "System", value: `${quote.actualKw} kW` },
          { label: "Panels", value: `${modules} × ${solar.watt}W` },
          { label: "Est. saving/mo", value: `₹${monthlySaving.toLocaleString("en-IN")}` },
          { label: "EMI/mo", value: fin.enabled ? `₹${emi.toLocaleString("en-IN")}` : "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/80 bg-white/90 px-2.5 py-2 text-center shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Plant kW */}
      <section className="space-y-2">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Required system size (kW)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={solar.plantCapacityKw}
            onChange={(e) => patchSolar({ plantCapacityKw: parseFloat(e.target.value), moduleCountOverride: undefined })}
            className="flex-1 accent-emerald-600"
          />
          <NumericTextInput
            value={solar.plantCapacityKw}
            onValueChange={(n) => {
              const kw = n != null && n > 0 ? Math.max(0.5, Math.min(50, n)) : solar.plantCapacityKw;
              patchSolar({ plantCapacityKw: kw, moduleCountOverride: undefined });
            }}
            className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-bold tabular-nums dark:border-white/15 dark:bg-white/5"
            aria-label="System size kW"
          />
        </div>
        <p className="text-[11px] text-slate-500">
          At {solar.watt}W per panel → <strong>{modules} panels</strong> (auto-calculated, updates live)
        </p>
      </section>

      {/* DCR / Non-DCR */}
      <section className="space-y-2">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Panel category</label>
        <div className="flex flex-wrap gap-2">
          <Chip active={solar.panelTrack === "dcr"} onClick={() => patchSolar({ panelTrack: "dcr", moduleCountOverride: undefined })}>
            DCR (subsidy-friendly)
          </Chip>
          <Chip active={solar.panelTrack === "non_dcr"} onClick={() => patchSolar({ panelTrack: "non_dcr", moduleCountOverride: undefined })}>
            Non-DCR
          </Chip>
        </div>
      </section>

      {/* Brand + watt */}
      <section className="space-y-2">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Preferred brand</label>
        <div className="flex flex-wrap gap-2">
          {RESIDENTIAL_BRAND_PRESETS.map((b) => (
            <Chip
              key={b.brandId}
              active={solar.brandId === b.brandId}
              onClick={() => applyBrandPreset(b.brandId, b.brand, b.watt)}
            >
              {b.brand}
            </Chip>
          ))}
        </div>
        <label className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Wattage</label>
        <div className="flex flex-wrap gap-2">
          {RESIDENTIAL_WATT_PRESETS.map((w) => (
            <Chip key={w} active={solar.watt === w} onClick={() => patchSolar({ watt: w, moduleCountOverride: undefined })}>
              {w}W
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-500">Custom</span>
          <NumericTextInput
            integer
            value={solar.watt}
            fallback={540}
            onValueChange={(n) =>
              patchSolar({
                watt: n != null && n >= 100 ? n : solar.watt,
                moduleCountOverride: undefined,
              })
            }
            className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-center text-sm font-bold tabular-nums dark:border-white/15 dark:bg-white/5"
            aria-label="Custom panel wattage"
          />
          <span className="text-[10px] text-slate-500">Wp</span>
        </div>
      </section>

      {/* Roof + budget */}
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Building2 className="h-3.5 w-3.5" /> Roof type
          </label>
          <div className="flex flex-wrap gap-2">
            {(["flat", "slope", "mixed", "unknown"] as const).map((r) => (
              <Chip key={r} active={config.roofType === r} onClick={() => patch({ roofType: r })}>
                {r === "unknown" ? "Not sure" : r.charAt(0).toUpperCase() + r.slice(1)}
              </Chip>
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Layers className="h-3.5 w-3.5" /> Budget range
          </label>
          <div className="flex flex-wrap gap-2">
            {(["economy", "balanced", "premium"] as const).map((b) => (
              <Chip key={b} active={config.budgetRange === b} onClick={() => patch({ budgetRange: b })}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </Chip>
            ))}
          </div>
        </section>
      </div>

      {/* Battery + subsidy */}
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Battery className="h-4 w-4 text-violet-500" /> Battery backup
            </span>
            <input
              type="checkbox"
              checked={config.battery?.required ?? false}
              onChange={(e) =>
                patch({ battery: { required: e.target.checked, capacityKwh: e.target.checked ? 5 : undefined } })
              }
              className="h-4 w-4 rounded accent-violet-600"
            />
          </label>
          <AnimatePresence>
            {config.battery?.required ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-2">
                <NumericTextInput
                  value={config.battery?.capacityKwh ?? 5}
                  fallback={5}
                  onValueChange={(n) =>
                    patch({
                      battery: {
                        required: true,
                        capacityKwh: n != null && n > 0 ? Math.min(30, n) : config.battery?.capacityKwh ?? 5,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
                  aria-label="Battery capacity kWh"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
        <section className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Leaf className="h-4 w-4 text-emerald-500" /> Subsidy preference
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["maximize", "standard", "none"] as const).map((s) => (
              <Chip
                key={s}
                active={(config.subsidy?.preference ?? "maximize") === s}
                onClick={() => patch({ subsidy: { preference: s } })}
              >
                {s === "maximize" ? "Max subsidy" : s === "standard" ? "Standard" : "No subsidy slide"}
              </Chip>
            ))}
          </div>
        </section>
      </div>

      {/* EMI */}
      <section className="rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-orange-50/50 p-4 dark:border-amber-900/40 dark:from-amber-950/20">
        <label className="flex cursor-pointer items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-100">
            <Calculator className="h-4 w-4" /> Financing & EMI story
          </span>
          <input
            type="checkbox"
            checked={fin.enabled}
            onChange={(e) => patch({ financing: { ...fin, enabled: e.target.checked } })}
            className="h-4 w-4 rounded accent-amber-600"
          />
        </label>
        {fin.enabled ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-800/80">Interest %</p>
              <NumericTextInput
                value={fin.interestRatePct ?? 10.5}
                fallback={10.5}
                onValueChange={(n) =>
                  patch({ financing: { ...fin, interestRatePct: n ?? fin.interestRatePct ?? 10.5 } })
                }
                className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm font-semibold dark:border-white/15 dark:bg-white/5"
                aria-label="Interest rate percent"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-800/80">Tenure (years)</p>
              <select
                value={fin.selectedTenureYears ?? 5}
                onChange={(e) =>
                  patch({ financing: { ...fin, selectedTenureYears: parseInt(e.target.value, 10) } })
                }
                className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm font-semibold dark:border-white/15 dark:bg-white/5"
              >
                {[3, 5, 7, 10, 15].map((y) => (
                  <option key={y} value={y}>
                    {y} years
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end rounded-lg bg-white/80 px-3 py-2 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase text-slate-500">Monthly EMI</p>
              <p className="flex items-center gap-1 text-lg font-bold tabular-nums text-amber-950 dark:text-amber-100">
                <IndianRupee className="h-4 w-4" />
                {emi.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-500">on net ₹{netCostInr.toLocaleString("en-IN")}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-amber-900/70 dark:text-amber-200/70">Enable to show EMI options on the proposal.</p>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Zap className="h-3 w-3 text-emerald-500" />
        Tip: After generating, open Proposals → BOM to fine-tune pricing or save a template.
      </p>
    </div>
  );
}
