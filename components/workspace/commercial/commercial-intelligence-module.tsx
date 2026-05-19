"use client";

/**
 * PHASE B/C/D — Commercial Builder Panel (redesigned)
 * Org type badge · watt selection · DCR toggle · scenarios · financing
 * Replaces the old accordion-only panel with a cleaner, more visual design.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PANEL_CATALOG,
  PANEL_TECHNOLOGY_OPTIONS,
  formatPanelLabel,
  getPanelCatalogEntry,
} from "@/lib/commercial-panel-catalog";
import { NumericTextInput } from "@/components/ui/numeric-text-input";
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

// Custom-panel sentinel id
const CUSTOM_CATALOG_ID = "__custom__";

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
  workspaceSection: "panel" | "scenarios" | "financing";
};

// ─── Custom wattage state helper ─────────────────────────────────────────────
function useCustomPanel() {
  const [customBrand, setCustomBrand] = useState("");
  const [customWatt, setCustomWatt] = useState<string>("");
  return { customBrand, setCustomBrand, customWatt, setCustomWatt };
}

export function CommercialIntelligenceModule({
  systemKw,
  config,
  onChange,
  className,
  workspaceSection,
}: Props) {
  const [openSection, setOpenSection] = useState<string>("panel");
  const { customBrand, setCustomBrand, customWatt, setCustomWatt } = useCustomPanel();

  const catalogId = config.panel?.catalogId ?? "waaree-540-dcr";
  const isCustom = catalogId === CUSTOM_CATALOG_ID;
  const entry = isCustom ? null : getPanelCatalogEntry(catalogId);
  const orgSpec = config.orgType ? getOrgType(config.orgType) : null;

  // For custom panels derive watt from config or local state
  const activeWatt = isCustom
    ? (parseInt(customWatt) || config.panel?.watt || 0)
    : entry?.watt;

  function applyCustomPanel(
    brand: string,
    watt: number | undefined,
    rate?: number,
    technology?: string
  ) {
    const b = brand.trim() || "Custom";
    update({
      panel: {
        catalogId: CUSTOM_CATALOG_ID,
        brandId: b.toLowerCase().replace(/\s+/g, "_"),
        watt: watt && watt > 0 ? watt : undefined,
        panelType: "NON_DCR",
        ratePerWpInr: rate ?? config.panel?.ratePerWpInr,
        technology: technology ?? config.panel?.technology ?? "Mono PERC",
      },
      dcrComparison: {
        enabled: config.dcrComparison?.enabled !== false,
        brandId: b.toLowerCase().replace(/\s+/g, "_"),
        watt: watt || undefined,
      },
    });
  }

  function update(partial: Partial<CommercialProposalConfig>) {
    onChange({ ...config, ...partial });
  }

  useEffect(() => {
    if (!isCustom) return;
    if (config.panel?.watt) setCustomWatt(String(config.panel.watt));
  }, [isCustom, config.panel?.watt]);

  const panelTechnology =
    config.panel?.technology ?? entry?.technology ?? "Mono PERC";

  function setCatalogId(id: string) {
    const e = getPanelCatalogEntry(id);
    update({
      panel: {
        catalogId: id,
        brandId: e?.brandId,
        watt: e?.watt,
        panelType: e?.panelType,
        ratePerWpInr: config.panel?.ratePerWpInr ?? e?.ratePerWpInr,
        technology: e?.technology ?? config.panel?.technology,
      },
      dcrComparison: {
        enabled: config.dcrComparison?.enabled !== false,
        brandId: e?.brandId,
        watt: e?.watt,
      },
    });
  }

  function selectWatt(watt: number) {
    if (isCustom) {
      setCustomWatt(String(watt));
      applyCustomPanel(customBrand, watt, config.panel?.ratePerWpInr, panelTechnology);
      return;
    }
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
  const panels = isCustom
    ? `${activeWatt || "?"}W ${customBrand || "Custom"} NON-DCR`
    : entry
    ? `${entry.watt}W ${entry.brandLabel} ${entry.panelType}`
    : "Not set";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        {workspaceSection === "panel" && (
        <Section
          id="panel"
          icon={<Zap className="h-3.5 w-3.5" />}
          title="Panel & Pricing Registry"
          summary={panels}
          open
          onToggle={() => {}}
        >
          {/* Watt selector chips */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Module Wattage
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WATT_PRESETS.map((w) => {
                const active = !isCustom && entry?.watt === w;
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
              {/* Custom wattage chip */}
              <button
                type="button"
                onClick={() => {
                  if (!isCustom) {
                    setCatalogId(CUSTOM_CATALOG_ID);
                    update({
                      panel: {
                        catalogId: CUSTOM_CATALOG_ID,
                        panelType: "NON_DCR",
                        ratePerWpInr: config.panel?.ratePerWpInr ?? entry?.ratePerWpInr,
                        technology: config.panel?.technology ?? entry?.technology ?? "Mono PERC",
                      },
                    });
                  }
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-bold transition-all",
                  isCustom
                    ? "border-violet-400 bg-violet-600 text-white shadow-sm"
                    : "border-dashed border-slate-300 bg-white text-slate-500 hover:border-violet-300 hover:bg-violet-50"
                )}
              >
                Custom
              </button>
            </div>

            {/* Custom wattage input row */}
            {isCustom && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2">
                <NumericTextInput
                  integer
                  value={config.panel?.watt}
                  placeholder="600"
                  onValueChange={(w) => {
                    if (w !== undefined) setCustomWatt(String(w));
                    applyCustomPanel(customBrand, w, config.panel?.ratePerWpInr, panelTechnology);
                  }}
                  className="w-20 rounded-lg border border-violet-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-800 focus:border-violet-400 focus:outline-none"
                  aria-label="Custom module wattage"
                />
                <span className="text-[11px] font-semibold text-slate-500">W</span>
              </div>
            )}
          </div>

          {/* Brand + full panel picker */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Brand & Type
            </label>
            <select
              value={catalogId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === CUSTOM_CATALOG_ID) {
                  setCatalogId(CUSTOM_CATALOG_ID);
                  update({
                    panel: {
                      catalogId: CUSTOM_CATALOG_ID,
                      panelType: "NON_DCR",
                      ratePerWpInr: config.panel?.ratePerWpInr ?? entry?.ratePerWpInr,
                      technology: config.panel?.technology ?? entry?.technology ?? "Mono PERC",
                    },
                  });
                } else {
                  setCatalogId(val);
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none"
            >
              {PANEL_CATALOG.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPanelLabel(p)} — ₹{p.ratePerWpInr}/Wp
                </option>
              ))}
              <option value={CUSTOM_CATALOG_ID}>➕ Add custom brand / panel</option>
            </select>

            {/* Custom brand name input */}
            {isCustom && (
              <input
                type="text"
                placeholder="Brand name (e.g. Trina Solar)"
                value={customBrand}
                onChange={(e) => {
                  setCustomBrand(e.target.value);
                  applyCustomPanel(
                    e.target.value,
                    config.panel?.watt,
                    config.panel?.ratePerWpInr,
                    panelTechnology
                  );
                }}
                className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
              />
            )}
          </div>

          {/* Rate override */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Rate ₹/Wp
              </label>
              <NumericTextInput
                value={config.panel?.ratePerWpInr}
                fallback={entry?.ratePerWpInr}
                placeholder="e.g. 42"
                onValueChange={(v) => {
                  if (isCustom) {
                    applyCustomPanel(customBrand, config.panel?.watt, v, panelTechnology);
                  } else {
                    update({
                      panel: {
                        catalogId,
                        brandId: entry?.brandId,
                        watt: entry?.watt,
                        panelType: entry?.panelType,
                        ratePerWpInr: v,
                        technology: panelTechnology,
                      },
                    });
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                aria-label="Rate per watt peak"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Technology
              </label>
              <select
                value={panelTechnology}
                onChange={(e) => {
                  const tech = e.target.value;
                  if (isCustom) {
                    applyCustomPanel(customBrand, config.panel?.watt, config.panel?.ratePerWpInr, tech);
                  } else {
                    update({
                      panel: {
                        catalogId,
                        brandId: entry?.brandId,
                        watt: entry?.watt,
                        panelType: entry?.panelType,
                        ratePerWpInr: config.panel?.ratePerWpInr ?? entry?.ratePerWpInr,
                        technology: tech,
                      },
                    });
                  }
                }}
                className="h-[38px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-sky-400 focus:outline-none"
              >
                {PANEL_TECHNOLOGY_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {!PANEL_TECHNOLOGY_OPTIONS.includes(
                  panelTechnology as (typeof PANEL_TECHNOLOGY_OPTIONS)[number]
                ) && <option value={panelTechnology}>{panelTechnology}</option>}
              </select>
            </div>
          </div>

          {/* Inverter phase selector */}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Inverter Phase
            </label>
            <div className="flex gap-2">
              {(["single", "three"] as const).map((phase) => {
                const active = (config.inverterPhase ?? "three") === phase;
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => update({ inverterPhase: phase })}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-[11px] font-bold transition-all",
                      active
                        ? "border-sky-400 bg-sky-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    )}
                  >
                    {phase === "single" ? "Single Phase" : "Three Phase"}
                    <span className="mt-0.5 block text-[9px] font-normal opacity-75">
                      {phase === "single" ? "Up to 10kW" : "10kW+"}
                    </span>
                  </button>
                );
              })}
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
        )}

        {workspaceSection === "scenarios" && (
        <Section
          id="scenarios"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          title="Capacity Scenarios"
          summary={
            scenariosEnabled
              ? `${scenarios.length} options · ${scenarios.map((s) => `${s.systemKw}kW`).join(", ")}`
              : "Off"
          }
          open
          onToggle={() => {}}
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
                  <NumericTextInput
                    value={s.systemKw}
                    onValueChange={(kw) => {
                      const updated = scenarios.map((x) =>
                        x.id === s.id ? { ...x, systemKw: kw ?? s.systemKw } : x
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
                    aria-label={`${s.label} capacity kW`}
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
        )}

        {workspaceSection === "financing" && (
        <Section
          id="financing"
          icon={<CreditCard className="h-3.5 w-3.5" />}
          title="Financing / EMI"
          summary={
            financingEnabled
              ? `${config.financing?.interestRatePct ?? DEFAULT_COMMERCIAL_RATE_PCT}% p.a. · ${config.financing?.lenderLabel ?? "NBFC / Bank"}`
              : "Off"
          }
          open
          onToggle={() => {}}
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
              <NumericTextInput
                value={config.financing?.interestRatePct}
                fallback={DEFAULT_COMMERCIAL_RATE_PCT}
                onValueChange={(v) =>
                  update({
                    financing: {
                      ...config.financing,
                      enabled: true,
                      interestRatePct: v ?? 0,
                    },
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                aria-label="Interest rate percent"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Down Payment (₹)
              </label>
              <NumericTextInput
                integer
                value={config.financing?.downPaymentInr}
                fallback={0}
                onValueChange={(v) =>
                  update({
                    financing: {
                      ...config.financing,
                      enabled: true,
                      downPaymentInr: v ?? 0,
                    },
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                aria-label="Down payment in rupees"
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
        )}
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
