"use client";

/**
 * Commercial Input Mode Selector
 * Shown in the commercial Step-2 area after category is selected.
 *
 * Bill-based: upload electricity bills → auto-fill customer + consumption data (existing flow)
 * Requirement-based: enter customer name, org name, monthly kWh need, notes (no bill upload)
 *
 * When "requirement" mode is active the component renders a simple inline form
 * that writes into the manual customer state — bill upload area is hidden.
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  FileUp,
  ClipboardList,
  Building2,
  User,
  Phone,
  MapPin,
  Zap,
  StickyNote,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export type CommercialInputMode = "bill" | "requirement";

// ─── Mode card ────────────────────────────────────────────────────────────────

function ModeCard({
  active,
  icon: Icon,
  title,
  description,
  onSelect,
  accent,
}: {
  active: boolean;
  icon: React.ElementType;
  title: string;
  description: string;
  onSelect: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        active
          ? `border-sky-400 bg-gradient-to-br from-sky-50 to-indigo-50 shadow-md ring-1 ring-sky-300`
          : "border-slate-200 bg-white hover:border-sky-200 hover:shadow-sm"
      )}
    >
      {active && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white"
        >
          <Check className="h-3 w-3 stroke-[3]" />
        </motion.div>
      )}
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
          active ? `${accent} text-white shadow-sm` : "bg-slate-100 text-slate-600"
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className={cn("pr-6 text-[13px] font-bold leading-tight", active ? "text-sky-900" : "text-slate-800")}>
        {title}
      </p>
      <p className="text-[11px] leading-snug text-slate-500">{description}</p>
    </button>
  );
}

// ─── Manual requirement fields ────────────────────────────────────────────────

type RequirementFormProps = {
  contactName: string;
  orgName: string;
  phone: string;
  city: string;
  monthlyKwh: string;
  notes: string;
  onContactName: (v: string) => void;
  onOrgName: (v: string) => void;
  onPhone: (v: string) => void;
  onCity: (v: string) => void;
  onMonthlyKwh: (v: string) => void;
  onNotes: (v: string) => void;
  canOpenWorkspace?: boolean;
  workspaceBusy?: boolean;
  onOpenWorkspace?: () => void;
  workspaceBlockReason?: string | null;
  proposalsHref?: string | null;
};

function RequirementForm({
  contactName,
  orgName,
  phone,
  city,
  monthlyKwh,
  notes,
  onContactName,
  onOrgName,
  onPhone,
  onCity,
  onMonthlyKwh,
  onNotes,
  canOpenWorkspace = false,
  workspaceBusy,
  onOpenWorkspace,
  workspaceBlockReason = null,
  proposalsHref,
}: RequirementFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="mt-3 space-y-2.5 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/60 to-white p-4"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
        Client &amp; Requirement Details
      </p>

      {/* Name + Org */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field
          icon={User}
          placeholder="Contact person name *"
          value={contactName}
          onChange={onContactName}
          required
        />
        <Field
          icon={Building2}
          placeholder="Organisation / Company name *"
          value={orgName}
          onChange={onOrgName}
          required
        />
      </div>

      {/* Phone + City */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field icon={Phone} placeholder="Phone number" value={phone} onChange={onPhone} inputMode="tel" />
        <Field icon={MapPin} placeholder="City / Location" value={city} onChange={onCity} />
      </div>

      {/* Monthly consumption */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Monthly electricity consumption (units / kWh)
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Zap className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 12000 (leave blank to size from kW directly)"
            value={monthlyKwh}
            onChange={(e) => onMonthlyKwh(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="text-[11px] text-slate-400">kWh/mo</span>
        </div>
      </div>

      {/* Requirements / Notes */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Special requirements / notes (optional)
        </label>
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <textarea
            rows={2}
            placeholder="e.g. Rooftop area 5000 sq ft, net-metering preferred, no battery, urgency: 2 weeks"
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-indigo-200/70 bg-indigo-50/50 px-3 py-3">
        <p className="text-[11px] font-semibold text-indigo-900">
          Panel pricing (DCR / Non-DCR) lives in the Proposals tab — Commercial BOM, not on this page.
        </p>
        {onOpenWorkspace ? (
          <button
            type="button"
            disabled={!canOpenWorkspace || workspaceBusy}
            onClick={onOpenWorkspace}
            title={workspaceBlockReason ?? undefined}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            {workspaceBusy ? "Saving…" : "Go to Proposals — configure panel & BOM"}
          </button>
        ) : null}
        {!canOpenWorkspace && workspaceBlockReason ? (
          <p className="mt-2 text-center text-[11px] font-medium text-amber-800">{workspaceBlockReason}</p>
        ) : null}
        {proposalsHref && canOpenWorkspace ? (
          <p className="mt-2 text-center text-[10px] text-slate-500">
            Opens your deal in Proposals → Commercial panel pricing + full BOM.
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  required,
  inputMode,
}: {
  icon: React.ElementType;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-sky-400">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
      <input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type Props = {
  mode: CommercialInputMode;
  onModeChange: (mode: CommercialInputMode) => void;
  // Requirement mode fields
  contactName: string;
  orgName: string;
  phone: string;
  city: string;
  monthlyKwh: string;
  notes: string;
  onContactName: (v: string) => void;
  onOrgName: (v: string) => void;
  onPhone: (v: string) => void;
  onCity: (v: string) => void;
  onMonthlyKwh: (v: string) => void;
  onNotes: (v: string) => void;
  canOpenWorkspace?: boolean;
  workspaceBusy?: boolean;
  onOpenWorkspace?: () => void;
  workspaceBlockReason?: string | null;
  proposalsHref?: string | null;
};

export function CommercialInputModeSelector({
  mode,
  onModeChange,
  contactName,
  orgName,
  phone,
  city,
  monthlyKwh,
  notes,
  onContactName,
  onOrgName,
  onPhone,
  onCity,
  onMonthlyKwh,
  onNotes,
  canOpenWorkspace,
  workspaceBusy,
  onOpenWorkspace,
  workspaceBlockReason,
  proposalsHref,
}: Props) {
  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <ModeCard
          active={mode === "bill"}
          icon={FileUp}
          title="Bill-based"
          description="Upload electricity bills. Customer connection details auto-filled."
          onSelect={() => onModeChange("bill")}
          accent="bg-sky-600"
        />
        <ModeCard
          active={mode === "requirement"}
          icon={ClipboardList}
          title="Requirement-based"
          description="Just enter name, org, and monthly need. No bill needed."
          onSelect={() => onModeChange("requirement")}
          accent="bg-indigo-600"
        />
      </div>

      {/* Requirement form (only in requirement mode) */}
      <AnimatePresence mode="wait">
        {mode === "requirement" && (
          <RequirementForm
            key="req-form"
            contactName={contactName}
            orgName={orgName}
            phone={phone}
            city={city}
            monthlyKwh={monthlyKwh}
            notes={notes}
            onContactName={onContactName}
            onOrgName={onOrgName}
            onPhone={onPhone}
            onCity={onCity}
            onMonthlyKwh={onMonthlyKwh}
            onNotes={onNotes}
            canOpenWorkspace={canOpenWorkspace}
            workspaceBusy={workspaceBusy}
            onOpenWorkspace={onOpenWorkspace}
            workspaceBlockReason={workspaceBlockReason}
            proposalsHref={proposalsHref}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
