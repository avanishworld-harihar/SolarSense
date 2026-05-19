"use client";

import {
  PANEL_CATALOG,
  formatPanelLabel,
  getPanelCatalogEntry,
} from "@/lib/commercial-panel-catalog";
import { buildDefaultScenarios } from "@/lib/commercial-capacity-scenarios";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import { DEFAULT_COMMERCIAL_RATE_PCT, DEFAULT_COMMERCIAL_TENURES } from "@/lib/commercial-financing";
import { cn } from "@/lib/utils";
import { ChevronDown, Layers, Scale, Zap } from "lucide-react";

type Props = {
  systemKw: number;
  config: CommercialProposalConfig;
  onChange: (next: CommercialProposalConfig) => void;
  className?: string;
};

export function CommercialBuilderPanel({ systemKw, config, onChange, className }: Props) {
  const catalogId = config.panel?.catalogId ?? "waaree-540-dcr";
  const entry = getPanelCatalogEntry(catalogId);

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

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-sm dark:border-sky-900/40 dark:from-sky-950/30 dark:to-[#0c1017]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Commercial configuration</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Panel · scenarios · financing — saved with proposal
          </p>
        </div>
      </div>

      <Accordion title="Panel & pricing" icon={<Zap className="h-3.5 w-3.5" />} defaultOpen>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Module configuration
        </label>
        <select
          value={catalogId}
          onChange={(e) => setCatalogId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          {PANEL_CATALOG.map((p) => (
            <option key={p.id} value={p.id}>
              {formatPanelLabel(p)} — ₹{p.ratePerWpInr}/Wp
            </option>
          ))}
        </select>

        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Override rate (₹/Wp)
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
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.dcrComparison?.enabled !== false}
            onChange={(e) =>
              update({
                dcrComparison: {
                  ...config.dcrComparison,
                  enabled: e.target.checked,
                  brandId: entry?.brandId,
                  watt: entry?.watt,
                },
              })
            }
            className="rounded border-slate-300"
          />
          <Scale className="h-3.5 w-3.5 text-sky-600" />
          Include DCR vs Non-DCR comparison
        </label>
      </Accordion>

      <Accordion title="Capacity scenarios" icon={<Layers className="h-3.5 w-3.5" />}>
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.capacityScenarios?.enabled !== false}
            onChange={(e) =>
              update({
                capacityScenarios: {
                  ...config.capacityScenarios,
                  enabled: e.target.checked,
                  scenarios:
                    config.capacityScenarios?.scenarios ?? buildDefaultScenarios(systemKw),
                  recommendedId: config.capacityScenarios?.recommendedId ?? "primary",
                },
              })
            }
            className="rounded border-slate-300"
          />
          Multi-kW scenario comparison
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(config.capacityScenarios?.scenarios ?? buildDefaultScenarios(systemKw)).map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-slate-200 bg-white/80 p-2 text-center dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-[10px] font-medium text-slate-500">{s.label}</p>
              <input
                type="number"
                min={1}
                value={s.systemKw}
                onChange={(e) => {
                  const kw = parseFloat(e.target.value) || s.systemKw;
                  const scenarios = (
                    config.capacityScenarios?.scenarios ?? buildDefaultScenarios(systemKw)
                  ).map((x) => (x.id === s.id ? { ...x, systemKw: kw } : x));
                  update({
                    capacityScenarios: {
                      enabled: true,
                      scenarios,
                      recommendedId: config.capacityScenarios?.recommendedId ?? "primary",
                    },
                  });
                }}
                className="mt-1 w-full rounded border border-slate-200 bg-transparent px-1 py-0.5 text-center text-sm font-bold dark:border-white/10"
              />
              <span className="text-[10px] text-slate-400">kW</span>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion title="Financing / EMI">
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.financing?.enabled === true}
            onChange={(e) =>
              update({
                financing: {
                  ...config.financing,
                  enabled: e.target.checked,
                  interestRatePct: config.financing?.interestRatePct ?? DEFAULT_COMMERCIAL_RATE_PCT,
                  tenuresYears: config.financing?.tenuresYears ?? [...DEFAULT_COMMERCIAL_TENURES],
                },
              })
            }
            className="rounded border-slate-300"
          />
          Include commercial EMI section
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field
            label="Interest % p.a."
            value={config.financing?.interestRatePct ?? DEFAULT_COMMERCIAL_RATE_PCT}
            onChange={(v) =>
              update({
                financing: { ...config.financing, enabled: true, interestRatePct: v },
              })
            }
          />
          <Field
            label="Down payment (₹)"
            value={config.financing?.downPaymentInr ?? 0}
            onChange={(v) =>
              update({
                financing: { ...config.financing, enabled: true, downPaymentInr: v },
              })
            }
          />
        </div>
        <input
          type="text"
          placeholder="Lender / NBFC name"
          value={config.financing?.lenderLabel ?? ""}
          onChange={(e) =>
            update({
              financing: { ...config.financing, enabled: true, lenderLabel: e.target.value },
            })
          }
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
        />
      </Accordion>
    </div>
  );
}

function Accordion({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-xl border border-slate-200/80 bg-white/60 dark:border-white/8 dark:bg-white/[0.03]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 px-3 py-3 dark:border-white/5">{children}</div>
    </details>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-white/10 dark:bg-white/5"
      />
    </div>
  );
}
