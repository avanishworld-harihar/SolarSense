"use client";

/**
 * DealCard — E3 premium proposal card.
 *
 * Used in Pipeline (kanban), Grid, and compact List views.
 * Replaces the visual feel of ProposalListCard with richer intelligence:
 *   - Commercial vs Residential visual differentiation
 *   - Health score bar
 *   - Deal velocity indicator (hot/warm/cold)
 *   - Closing confidence badge
 *   - Next-action hint (from hubIntelForStatus)
 *   - Age / timeline chip
 *   - Quick-action buttons (Open workspace, Send WhatsApp)
 *
 * Does NOT touch: proposal engine, calculations, generation, routes.
 * Original ProposalListCard remains unchanged (used in list-pane view).
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock,
  Flame,
  Home,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  avatarHue,
  closingConfidence,
  customerInitials,
  dealAgeInDays,
  dealHealthScore,
  dealVelocity,
  hubIntelForStatus,
  isCommercialPreset,
  formatInrCompact,
  statusVisualLight,
  velocityVisual,
} from "@/lib/proposal-hub-insights";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import type { ProposalHubRow } from "@/lib/proposal-hub-insights";
import type { ProposalStatus } from "@/lib/proposal-status";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DealCardDensity = "pipeline" | "grid" | "compact";

export interface DealCardProps {
  row: ProposalHubRow;
  density?: DealCardDensity;
  active?: boolean;
  lang?: "en" | "hi";
  onClick?: (id: string) => void;
  delay?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(days: number, lang: "en" | "hi"): string {
  if (days === 0) return lang === "hi" ? "आज" : "Today";
  if (days === 1) return lang === "hi" ? "1 दिन पहले" : "1d ago";
  if (days < 7) return lang === "hi" ? `${days} दिन पहले` : `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return lang === "hi" ? `${weeks} हफ्ते पहले` : `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return lang === "hi" ? `${months} महीने पहले` : `${months}mo ago`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  isCommercial,
  size = "md",
}: {
  name: string;
  isCommercial: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const hue = avatarHue(name);
  const initials = customerInitials(name);
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-xs";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl font-black text-white shadow-md",
        sizeClass
      )}
      style={{
        background: isCommercial
          ? `linear-gradient(135deg, hsl(${hue} 40% 25%), hsl(${(hue + 30) % 360} 35% 18%))`
          : `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 50% 32%))`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProposalStatus }) {
  const vis = statusVisualLight(status);
  const labels: Record<ProposalStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    negotiation: "Negotiation",
    approved: "Approved",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]",
        vis.bg,
        vis.text,
        vis.border
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", vis.dot)} aria-hidden />
      {labels[status]}
    </span>
  );
}

// ─── Health bar ───────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-400"
      : score >= 45
        ? "bg-amber-400"
        : "bg-rose-400";

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
      <div
        className={cn("h-full rounded-full transition-all duration-700", color)}
        style={{ width: `${score}%` }}
        aria-label={`Deal health: ${score}%`}
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

// ─── Pipeline card (kanban column) ───────────────────────────────────────────

function PipelineCard({ row, active, lang = "en", onClick, delay = 0 }: DealCardProps) {
  const st = normalizeProposalStatus(row.proposal_status);
  const isCommercial = isCommercialPreset(row.preset_id);
  const health = dealHealthScore(row);
  const velocity = dealVelocity(row);
  const velVis = velocityVisual(velocity);
  const confidence = closingConfidence(row);
  const age = dealAgeInDays(row.generated_at);
  const intel = hubIntelForStatus(st, lang);
  const manageHref = `/proposals/${row.id}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onClick?.(row.id)}
      className={cn(
        "group relative flex w-[17rem] shrink-0 flex-col rounded-2xl border",
        "bg-white shadow-sm transition-all duration-200",
        "cursor-pointer hover:shadow-lg hover:-translate-y-0.5",
        active
          ? "border-teal-400/70 ring-2 ring-teal-400/30 shadow-[0_4px_24px_rgba(20,184,166,0.15)]"
          : "border-slate-200/80 hover:border-teal-300/60",
        "dark:bg-[#0f1419] dark:border-white/10 dark:hover:border-teal-500/30",
        isCommercial && "border-l-4 border-l-violet-400 dark:border-l-violet-500"
      )}
      aria-current={active ? "true" : undefined}
    >
      {/* Header strip */}
      <div className="p-4 pb-3">
        {/* Type badge */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]",
              isCommercial
                ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                : "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300"
            )}
          >
            {isCommercial ? (
              <Building2 className="h-2.5 w-2.5" aria-hidden />
            ) : (
              <Home className="h-2.5 w-2.5" aria-hidden />
            )}
            {isCommercial ? "Commercial" : "Residential"}
          </span>
          {/* Velocity dot */}
          <span className={cn("flex items-center gap-1 text-[10px] font-semibold", velVis.color)}>
            {velocity === "hot" && <Flame className="h-3 w-3" aria-hidden />}
            {velocity !== "hot" && <span className={cn("h-1.5 w-1.5 rounded-full", velVis.dot)} aria-hidden />}
            {velVis.label}
          </span>
        </div>

        {/* Avatar + name */}
        <div className="flex items-start gap-3">
          <Avatar name={row.customer_name} isCommercial={isCommercial} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-snug text-slate-900 dark:text-slate-50">
              {row.customer_name}
            </p>
            {row.company_name && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {row.company_name}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-slate-500">
              <Zap className="h-3 w-3 text-amber-400" aria-hidden />
              <span>{row.system_kw} kW</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <CalendarDays className="h-3 w-3" aria-hidden />
              <span>{formatAge(age, lang)}</span>
            </div>
          </div>
        </div>

        {/* Financial row */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 px-3 py-2.5 dark:bg-white/[0.04]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Net Cost</p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-teal-800 dark:text-emerald-300">
              {formatInrCompact(row.final_amount_inr)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Annual Saving</p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-slate-700 dark:text-slate-200">
              {formatInrCompact(row.annual_saving_inr)}
            </p>
          </div>
        </div>
      </div>

      {/* Health bar */}
      <div className="px-4 pb-2">
        <HealthBar score={health} />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[9px] font-semibold text-slate-400">Deal health</span>
          <span className="text-[9px] font-bold tabular-nums text-slate-400">{health}%</span>
        </div>
      </div>

      {/* Next action hint */}
      <div
        className={cn(
          "mx-4 mb-3 rounded-lg border px-2.5 py-2",
          intel.tone === "success" ? "border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/8" :
          intel.tone === "warn" ? "border-amber-100 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/8" :
          "border-sky-100 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/8"
        )}
      >
        <p className={cn(
          "text-[10px] font-bold uppercase tracking-[0.12em]",
          intel.tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
          intel.tone === "warn" ? "text-amber-600 dark:text-amber-400" :
          "text-sky-600 dark:text-sky-400"
        )}>
          Next action
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
          {intel.title} — {intel.body}
        </p>
      </div>

      {/* Footer: confidence + CTA */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/[0.06]">
        {/* Confidence badge */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-400">Close</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
              confidence >= 70 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" :
              confidence >= 40 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" :
              "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
            )}
          >
            {confidence}%
          </span>
        </div>

        <div className="flex-1" />

        {/* Open workspace CTA */}
        <Link
          href={manageHref}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all",
            "bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:scale-95",
            "dark:bg-teal-500 dark:hover:bg-teal-400"
          )}
        >
          Open
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </motion.article>
  );
}

// ─── Grid card (2–3 column grid) ─────────────────────────────────────────────

function GridCard({ row, active, lang = "en", onClick, delay = 0 }: DealCardProps) {
  const st = normalizeProposalStatus(row.proposal_status);
  const isCommercial = isCommercialPreset(row.preset_id);
  const health = dealHealthScore(row);
  const age = dealAgeInDays(row.generated_at);
  const manageHref = `/proposals/${row.id}`;

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: delay * 0.04 }}
      onClick={() => onClick?.(row.id)}
      className={cn(
        "group flex flex-col rounded-2xl border bg-white",
        "cursor-pointer shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        active ? "border-teal-400/70 ring-2 ring-teal-400/25" : "border-slate-200/80 hover:border-teal-300/60",
        "dark:bg-[#0f1419] dark:border-white/10 dark:hover:border-teal-500/30",
        isCommercial && "border-t-4 border-t-violet-400 dark:border-t-violet-500"
      )}
      aria-current={active ? "true" : undefined}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <Avatar name={row.customer_name} isCommercial={isCommercial} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-50">{row.customer_name}</p>
          {row.company_name && (
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{row.company_name}</p>
          )}
          <div className="mt-1 flex items-center gap-1">
            <StatusBadge status={st} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100 border-t border-slate-100 dark:divide-white/[0.06] dark:border-white/[0.06]">
        <div className="px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Net Cost</p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-teal-700 dark:text-emerald-300">
            {formatInrCompact(row.final_amount_inr)}
          </p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{row.system_kw} kW</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <Clock className="h-3 w-3" aria-hidden />
            {formatAge(age, lang)}
          </p>
        </div>
      </div>

      <div className="px-4 py-2">
        <HealthBar score={health} />
      </div>

      <div className="flex gap-2 border-t border-slate-100 px-4 pb-3.5 pt-2.5 dark:border-white/[0.06]">
        <Link
          href={manageHref}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded-xl bg-teal-600 py-2 text-center text-[11px] font-bold text-white transition hover:bg-teal-700 active:scale-95 dark:bg-teal-500"
        >
          Open Workspace
        </Link>
      </div>
    </motion.article>
  );
}

// ─── Compact card (list row) ──────────────────────────────────────────────────

function CompactCard({ row, active, lang = "en", onClick, delay = 0 }: DealCardProps) {
  const st = normalizeProposalStatus(row.proposal_status);
  const isCommercial = isCommercialPreset(row.preset_id);
  const velocity = dealVelocity(row);
  const velVis = velocityVisual(velocity);
  const age = dealAgeInDays(row.generated_at);
  const manageHref = `/proposals/${row.id}`;

  return (
    <motion.article
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: delay * 0.03 }}
      onClick={() => onClick?.(row.id)}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3",
        "bg-white transition-all duration-150 hover:shadow-sm",
        active
          ? "border-teal-400/70 bg-teal-50/50 dark:border-teal-500/40 dark:bg-teal-500/8"
          : "border-slate-200/70 hover:border-teal-200 dark:border-white/8 dark:bg-[#0f1419] dark:hover:border-teal-500/30",
        isCommercial && "border-l-4 border-l-violet-400 dark:border-l-violet-500"
      )}
      aria-current={active ? "true" : undefined}
    >
      <Avatar name={row.customer_name} isCommercial={isCommercial} size="sm" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-bold text-slate-900 dark:text-slate-50">{row.customer_name}</p>
          {row.company_name && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">· {row.company_name}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
          <span>{row.system_kw} kW</span>
          <span>·</span>
          <span>{formatAge(age, lang)}</span>
          <span className={cn("flex items-center gap-0.5", velVis.color)}>
            · <span className={cn("h-1.5 w-1.5 rounded-full", velVis.dot)} aria-hidden /> {velVis.label}
          </span>
        </div>
      </div>

      <div className="hidden flex-col items-end gap-1 sm:flex">
        <p className="text-[13px] font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {formatInrCompact(row.final_amount_inr)}
        </p>
        <StatusBadge status={st} />
      </div>

      <Link
        href={manageHref}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Open workspace for ${row.customer_name}`}
        className="ml-1 hidden shrink-0 rounded-xl border border-slate-200 bg-white p-2 opacity-0 transition group-hover:opacity-100 hover:border-teal-300 dark:border-white/10 dark:bg-white/5 sm:flex"
      >
        <ArrowUpRight className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden />
      </Link>
    </motion.article>
  );
}

// ─── Unified export ───────────────────────────────────────────────────────────

export function DealCard(props: DealCardProps) {
  const { density = "pipeline" } = props;
  if (density === "grid") return <GridCard {...props} />;
  if (density === "compact") return <CompactCard {...props} />;
  return <PipelineCard {...props} />;
}

// Also export StatusBadge for use in pipeline board headers
export { StatusBadge };
