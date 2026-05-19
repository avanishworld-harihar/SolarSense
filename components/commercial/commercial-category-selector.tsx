"use client";

/**
 * PHASE A — Commercial Category Experience
 * Visual org-type tile selector. Each tile surfaces the segment identity,
 * typical system range, and primary solar benefit.
 * Selecting a category:
 *   1. Updates commercialConfig.orgType
 *   2. Seeds the kW input to the segment default (via onKwSeed)
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Factory,
  Warehouse,
  School,
  ShoppingBag,
  Briefcase,
  Cog,
  Heart,
  Milk,
  Check,
  ChevronDown,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { listOrgTypes, getOrgType, type OrgTypeSpec } from "@/lib/org-type-defaults";
import type { OrgType } from "@/lib/org-type-defaults";
import { cn } from "@/lib/utils";

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  hotel: Building2,
  hospital: Heart,
  factory: Factory,
  warehouse: Warehouse,
  dairy: Milk,
  school: School,
  mall: ShoppingBag,
  office: Briefcase,
  industry: Cog,
  generic: Building2,
};

function OrgIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = ICON_MAP[iconName] ?? Building2;
  return <Icon className={className} />;
}

// ─── Benefit labels ──────────────────────────────────────────────────────────

const BENEFIT_LABEL: Record<string, string> = {
  cost_reduction: "Cost savings focus",
  carbon_reduction: "Carbon & CSR focus",
  reliability: "Power reliability focus",
  compliance: "Compliance focus",
};

const BENEFIT_COLOR: Record<string, string> = {
  cost_reduction: "text-emerald-600 bg-emerald-50",
  carbon_reduction: "text-teal-600 bg-teal-50",
  reliability: "text-blue-600 bg-blue-50",
  compliance: "text-purple-600 bg-purple-50",
};

// ─── Single tile ─────────────────────────────────────────────────────────────

function CategoryTile({
  spec,
  selected,
  onSelect,
}: {
  spec: OrgTypeSpec;
  selected: boolean;
  onSelect: () => void;
}) {
  const benefitColor = BENEFIT_COLOR[spec.primaryBenefit] ?? "text-slate-600 bg-slate-50";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        selected
          ? "border-sky-400 bg-gradient-to-br from-sky-50 to-indigo-50 shadow-md shadow-sky-100/60 ring-1 ring-sky-300"
          : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm"
      )}
    >
      {/* Selected checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white"
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon */}
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-sky-600 text-white shadow-sm"
            : "bg-slate-100 text-slate-600"
        )}
      >
        <OrgIcon iconName={spec.iconName} className="h-4.5 w-4.5" />
      </div>

      {/* Labels */}
      <div className="min-w-0 flex-1 pr-6">
        <p className={cn("text-[13px] font-bold leading-tight", selected ? "text-sky-900" : "text-slate-900")}>
          {spec.labelEn}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2">{spec.descriptionEn}</p>
      </div>

      {/* Badges */}
      <div className="flex w-full flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", benefitColor)}>
          {BENEFIT_LABEL[spec.primaryBenefit]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          <Zap className="h-2.5 w-2.5" />
          {spec.defaultKw} kW typical
        </span>
      </div>
    </motion.button>
  );
}

// ─── Main selector ────────────────────────────────────────────────────────────

type Props = {
  value: OrgType | string | null | undefined;
  onChange: (orgType: OrgType, defaultKw: number) => void;
  className?: string;
};

export function CommercialCategorySelector({ value, onChange, className }: Props) {
  const [expanded, setExpanded] = useState(!value);
  const specs = listOrgTypes();
  const selected = value ? getOrgType(value) : null;

  function handleSelect(spec: OrgTypeSpec) {
    onChange(spec.id, spec.defaultKw);
    setExpanded(false);
  }

  return (
    <div className={cn("space-y-3 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white to-sky-50/60 p-4 shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Business Category</p>
            <p className="text-[11px] text-slate-500">
              {selected ? "Proposal will auto-adapt for this segment" : "Select to personalise proposal narrative"}
            </p>
          </div>
        </div>

        {/* Collapse toggle when a category is selected */}
        {selected && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-600 text-white">
              <OrgIcon iconName={selected.iconName} className="h-3 w-3" />
            </div>
            {selected.labelEn}
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Selected context pill (when collapsed) */}
      <AnimatePresence>
        {selected && !expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white">
                <OrgIcon iconName={selected.iconName} className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-sky-900">{selected.labelEn}</p>
                <p className="text-[10px] text-sky-700">{selected.descriptionEn}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", BENEFIT_COLOR[selected.primaryBenefit])}>
                  {BENEFIT_LABEL[selected.primaryBenefit]}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
                  {selected.typicalKwMin}–{selected.typicalKwMax} kW range
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tile grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {specs.map((spec) => (
                <CategoryTile
                  key={spec.id}
                  spec={spec}
                  selected={value === spec.id}
                  onSelect={() => handleSelect(spec)}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Selecting a category auto-adjusts ROI narrative, assumptions & executive wording
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
