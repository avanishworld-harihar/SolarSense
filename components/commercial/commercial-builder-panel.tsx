"use client";

/**
 * PHASE B/C/D — Commercial Builder Panel (redesigned)
 * Org type badge · watt selection · DCR toggle · scenarios · financing
 * Replaces the old accordion-only panel with a cleaner, more visual design.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PANEL_CATALOG,
  formatPanelLabel,
  getPanelCatalogEntry,
} from "@/lib/commercial-panel-catalog";
import { buildDefaultScenarios } from "@/lib/commercial-capacity-scenarios";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import { DEFAULT_COMMERCIAL_RATE_PCT, DEFAULT_COMMERCIAL_TENURES } from "@/lib/commercial-financing";
import { getOrgType } from "@/lib/org-type-defaults";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Zap,
  Scale,
  TrendingUp,
  Layers,
  CreditCard,
  Check,
  Building2,
  Info,
} from "lucide-react";

// ─── Watt presets ─────────────────────────────────────────────────────────────
const WATT_PRESETS = [540, 550, 575, 590, 615] as const;

// ─── Financing presets ────────────────────────────────────────────────────────
const FINANCING_PRESETS = [
  { label: "NBFC", rate: 11.5, tenures: [3, 5, 7] },
  { label: "Bank", rate: 9.0, tenures: [5, 7, 10] },
  { label: "Internal", rate: 0, tenures: [1, 2, 3] },
] as const;

type Props = {
  systemKw: number;
  config: CommercialProposalConfig;
  onChange: (next: CommercialProposalConfig) => void;
  className?: string;
};

export function CommercialBuilderPanel({ systemKw, config, onChange, className }: Props) {
  const [openSection, setOpenSection] = useState<string>("panel");

  const catalogId = config.panel?.catalogId ?? "waaree-540-dcr";
  const entry = getPanelCatalogEntry(catalogId);
  const orgSpec = config.orgType ? getOrgType(config.orgType) : null;

  function update(partial: Partial<CommercialProposalConfig>) {
    onChange({ ...config, ...partial });
  }

  function setCatalogId(id: string) {
    const e = getPanelCatalogEntry(id);
    update({
      panel: {
        catalogId: id,
        brandId: e?.brandId,
        watt: e?.watt,
        panelType: e?.panelType,
        ratePerWpInr: config.panel?.ratePerWpInr ?? e?.ratePerWpInr,
      },
      dcrComparison: {
        enabled: config.dcrComparison?.enabled !== false,
        brandId: e?.brandId,
        watt: e?.watt,
      },
    });
  }

  function selectWatt(watt: number) {
    // Find the nearest catalog entry with that wattage (prefer NON_DCR for flexibility)
    const match =
      PANEL_CATALOG.find((p) => p.watt === watt && p.panelType === entry?.panelType) ??
      PANEL_CATALOG.find((p) => p.watt === watt);
    if (match) setCatalogId(match.id);
  }

  const scenarios =
    config.capacityScenarios?.scenarios ?? buildDefaultScenarios(systemKw);
  const recommendedId = config.capacityScenarios?.recommendedId ?? "primary";

  const dcrEnabled = config.dcrComparison?.enabled !== false;
  const scenariosEnabled = config.capacityScenarios?.enabled !== false;
  const financingEnabled = config.financing?.enabled === true;

  const sectionCount = [dcrEnabled, scenariosEnabled, financingEnabled].filter(Boolean).length;

  // Summary pills for collapsed header
  const panels = entry ? `${entry.watt}W ${entry.brandLabel} ${entry.panelType}` : "Not set";

  return (
    <div className={cn("space-y-2 rounded-2xl border border-sky-200 bg-white shadow-sm", className)}>
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-sky-100 px-4 py-3.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
          <Layers className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Commercial Configuration</p>
          <p className="text-[11px] text-slate-500">
            {panels} · {sectionCount} extra section{sectionCount !== 1 ? "s" : ""} enabled
          </p>
        </div>
        {/* Org type badge */}
        {orgSpec && (
          <div className="hidden items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-2.5 py-1.5 sm:flex">
            <Building2 className="h-3 w-3 text-sky-600" />
            <span className="text-[11px] font-bold text-sky-700">{orgSpec.labelEn}</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-1 px-2 pb-2">
        {/* ── Panel & Pricing ─────────────────────────────────────────── */}
        <Section
          id="panel"
          icon={<Zap className="h-3.5 w-3.5" />}
          title="Panel & Pricing"
          summary={panels}
          open={openSection === "panel"}
          onToggle={() => setOpenSection((s) => (s === "panel" ? "" : "panel"))}
        >
          {/* Watt selector chips */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Module Wattage
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WATT_PRESETS.map((w) => {
                const active = entry?.watt === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => selectWatt(w)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-bold transition-all",
                      active
                        ? "border-sky-400 bg-sky-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                    )}
                  >
                    {w}W
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand + full panel picker */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Brand & Type
            </label>
            <select
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none"
            >
              {PANEL_CATALOG.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPanelLabel(p)} — ₹{p.ratePerWpInr}/Wp
                </option>
              ))}
            </select>
          </div>

          {/* Rate override */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Rate ₹/Wp
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={config.panel?.ratePerWpInr ?? entry?.ratePerWpInr ?? ""}
                onChange={(e) =>
                  update({
                    panel: {
                      catalogId,
                      brandId: entry?.brandId,
                      watt: entry?.watt,
                      panelType: entry?.panelType,
                      ratePerWpInr: parseFloat(e.target.value) || undefined,
                    },
                  })
                }
                placeholder={String(entry?.ratePerWpInr ?? "")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Technology
              </label>
              <div className="flex h-[38px] items-center rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                {entry?.technology ?? "—"}
              </div>
            </div>
          </div>

          {/* DCR toggle — visual card */}
          <div
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
              dcrEnabled
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50/60 opacity-70"
            )}
            onClick={() =>
              update({
                dcrComparison: {
                  ...config.dcrComparison,
                  enabled: !dcrEnabled,
                  brandId: entry?.brandId,
                  watt: entry?.watt,
                },
              })
            }
          >
            <div
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                dcrEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
              )}
            >
              <Scale className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold text-slate-900">DCR vs Non-DCR Comparison</p>
              <p className="text-[10px] text-slate-500">
                Side-by-side cost card in the proposal · subsidy impact noted
              </p>
            </div>
            <Toggle checked={dcrEnabled} />
          </div>
        </Section>

        {/* ── Capacity Scenarios ───────────────────────────────────────── */}
        <Section
          id="scenarios"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          title="Capacity Scenarios"
          summary={
            scenariosEnabled
              ? `${scenarios.length} options · ${scenarios.map((s) => `${s.systemKw}kW`).join(", ")}`
              : "Off"
          }
          open={openSection === "scenarios"}
          onToggle={() => setOpenSection((s) => (s === "scenarios" ? "" : "scenarios"))}
          badge={scenariosEnabled ? "on" : undefined}
        >
          {/* Enable toggle */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">Multi-kW scenario comparison</p>
            <ToggleSwitch
              checked={scenariosEnabled}
              onChange={(v) =>
                update({
                  capacityScenarios: {
                    ...config.capacityScenarios,
                    enabled: v,
                    scenarios: scenarios,
                    recommendedId,
                  },
                })
              }
            />
          </div>

          {/* Scenario cards with recommend radio */}
          <div className="grid grid-cols-3 gap-2">
            {scenarios.map((s) => {
              const isRec = s.id === recommendedId;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-xl border p-2 text-center transition-all",
                    isRec
                      ? "border-sky-400 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <p className="mb-1 text-[10px] font-medium text-slate-500">{s.label}</p>
                  <input
                    type="number"
                    min={1}
                    value={s.systemKw}
                    onChange={(e) => {
                      const kw = parseFloat(e.target.value) || s.systemKw;
                      const updated = scenarios.map((x) =>
                        x.id === s.id ? { ...x, systemKw: kw } : x
                      );
                      update({
                        capacityScenarios: {
                          enabled: scenariosEnabled,
                          scenarios: updated,
                          recommendedId,
                        },
                      });
                    }}
                    className="w-full rounded-lg border border-transparent bg-transparent text-center text-sm font-bold text-slate-800 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200"
                  />
                  <span className="text-[10px] text-slate-400">kW</span>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        capacityScenarios: {
                          enabled: scenariosEnabled,
                          scenarios,
                          recommendedId: s.id,
                        },
                      })
                    }
                    className={cn(
                      "mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg py-0.5 text-[10px] font-semibold transition-all",
                      isRec
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                    )}
                  >
                    {isRec && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    {isRec ? "Recommended" : "Set as pick"}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-2 text-[10px] text-slate-400">
            The recommended option is visually highlighted in the proposal
          </p>
        </Section>

        {/* ── Financing / EMI ──────────────────────────────────────────── */}
        <Section
          id="financing"
          icon={<CreditCard className="h-3.5 w-3.5" />}
          title="Financing / EMI"
          summary={
            financingEnabled
              ? `${config.financing?.interestRatePct ?? DEFAULT_COMMERCIAL_RATE_PCT}% p.a. · ${config.financing?.lenderLabel ?? "NBFC / Bank"}`
              : "Off"
          }
          open={openSection === "financing"}
          onToggle={() => setOpenSection((s) => (s === "financing" ? "" : "financing"))}
          badge={financingEnabled ? "on" : undefined}
        >
          {/* Enable toggle */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">Commercial EMI section</p>
            <ToggleSwitch
              checked={financingEnabled}
              onChange={(v) =>
                update({
                  financing: {
                    ...config.financing,
                    enabled: v,
                    interestRatePct: config.financing?.interestRatePct ?? DEFAULT_COMMERCIAL_RATE_PCT,
                    tenuresYears: config.financing?.tenuresYears ?? [...DEFAULT_COMMERCIAL_TENURES],
                  },
                })
              }
            />
          </div>

          {/* Lender presets */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Financing Preset
            </label>
            <div className="flex gap-1.5">
              {FINANCING_PRESETS.map((preset) => {
                const active =
                  config.financing?.lenderLabel === preset.label &&
                  config.financing?.interestRatePct === preset.rate;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      update({
                        financing: {
                          ...config.financing,
                          enabled: true,
                          lenderLabel: preset.label,
                          interestRatePct: preset.rate,
                          tenuresYears: [...preset.tenures],
                        },
                      })
                    }
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-[11px] font-bold transition-all",
                      active
                        ? "border-sky-400 bg-sky-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    )}
                  >
                    {preset.label}
                    <span className="mt-0.5 block text-[9px] font-normal opacity-75">
                      {preset.rate === 0 ? "0%" : `${preset.rate}% p.a.`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rate + down payment */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Interest % p.a.
              </label>
              <input
                type="number"
                min={0}
                max={25}
                step={0.25}
                value={config.financing?.interestRatePct ?? DEFAULT_COMMERCIAL_RATE_PCT}
                onChange={(e) =>
                  update({
                    financing: {
                      ...config.financing,
                      enabled: true,
                      interestRatePct: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Down Payment (₹)
              </label>
              <input
                type="number"
                min={0}
                step={10000}
                value={config.financing?.downPaymentInr ?? 0}
                onChange={(e) =>
                  update({
                    financing: {
                      ...config.financing,
                      enabled: true,
                      downPaymentInr: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Tenure picker */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tenures (years)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 5, 7, 10, 12, 15].map((yr) => {
                const tenures: number[] = config.financing?.tenuresYears ?? [...DEFAULT_COMMERCIAL_TENURES];
                const active = tenures.includes(yr);
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? tenures.filter((t) => t !== yr)
                        : [...tenures, yr].sort((a, b) => a - b);
                      if (next.length === 0) return;
                      update({
                        financing: {
                          ...config.financing,
                          enabled: true,
                          tenuresYears: next,
                        },
                      });
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-all",
                      active
                        ? "border-sky-400 bg-sky-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-sky-200"
                    )}
                  >
                    {yr}y
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lender name */}
          <input
            type="text"
            placeholder="Lender / NBFC name (optional)"
            value={config.financing?.lenderLabel ?? ""}
            onChange={(e) =>
              update({
                financing: {
                  ...config.financing,
                  enabled: true,
                  lenderLabel: e.target.value,
                },
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </Section>
      </div>

      {/* Hint */}
      <div className="flex items-center gap-2 border-t border-sky-50 px-4 py-2.5">
        <Info className="h-3 w-3 flex-shrink-0 text-sky-400" />
        <p className="text-[10px] text-slate-500">
          All settings are saved with the proposal. Toggle sections on/off in Review.
        </p>
      </div>
    </div>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────

function Section({
  id,
  icon,
  title,
  summary,
  open,
  onToggle,
  badge,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  badge?: "on";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm border border-slate-100">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-slate-900">{title}</p>
          <p className="truncate text-[10px] text-slate-500">{summary}</p>
        </div>
        {badge && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
            ON
          </span>
        )}
        <ChevronDown
          className={cn("h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 bg-white px-3 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toggle pill ──────────────────────────────────────────────────────────────
function Toggle({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        checked ? "bg-sky-500" : "bg-slate-300"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      <Toggle checked={checked} />
    </button>
  );
}
