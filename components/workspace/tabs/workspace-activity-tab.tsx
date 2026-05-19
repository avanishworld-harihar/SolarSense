"use client";

/**
 * WorkspaceActivityTab — append-only proposal event timeline.
 *
 * Renders each ApprovalEventRow as a timeline entry with:
 *  - Event type icon + color
 *  - Formatted timestamp (relative + absolute)
 *  - Human-readable title + contextual body from payload
 *  - Actor attribution when present
 *
 * Events are shown newest-first (reversed from append order).
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  BadgeCheck,
  BadgeX,
  Camera,
  Coins,
  FolderPlus,
  GitBranch,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import type { ApprovalEventRow, ApprovalEventType } from "@/lib/proposal-approval-events";
import { cn } from "@/lib/utils";

// ─── Event type config ─────────────────────────────────────────────────────

type EventConfig = {
  icon: React.ReactNode;
  label: string;
  dotColor: string;
  lineColor: string;
};

function eventConfig(type: ApprovalEventType): EventConfig {
  switch (type) {
    case "status_changed":
      return {
        icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
        label: "Status changed",
        dotColor: "bg-sky-500",
        lineColor: "border-sky-200 dark:border-sky-700/50",
      };
    case "snapshot_created":
      return {
        icon: <Camera className="h-3.5 w-3.5" />,
        label: "Pricing snapshot created",
        dotColor: "bg-violet-500",
        lineColor: "border-violet-200 dark:border-violet-700/50",
      };
    case "pricing_revised":
      return {
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        label: "Pricing revised",
        dotColor: "bg-amber-500",
        lineColor: "border-amber-200 dark:border-amber-700/50",
      };
    case "discount_applied":
      return {
        icon: <Coins className="h-3.5 w-3.5" />,
        label: "Discount applied",
        dotColor: "bg-rose-500",
        lineColor: "border-rose-200 dark:border-rose-700/50",
      };
    case "project_created":
      return {
        icon: <FolderPlus className="h-3.5 w-3.5" />,
        label: "Project created",
        dotColor: "bg-teal-500",
        lineColor: "border-teal-200 dark:border-teal-700/50",
      };
    case "approval_requested":
      return {
        icon: <GitBranch className="h-3.5 w-3.5" />,
        label: "Approval requested",
        dotColor: "bg-orange-500",
        lineColor: "border-orange-200 dark:border-orange-700/50",
      };
    case "approval_granted":
      return {
        icon: <BadgeCheck className="h-3.5 w-3.5" />,
        label: "Approval granted",
        dotColor: "bg-emerald-500",
        lineColor: "border-emerald-200 dark:border-emerald-700/50",
      };
    case "approval_rejected":
      return {
        icon: <BadgeX className="h-3.5 w-3.5" />,
        label: "Approval rejected",
        dotColor: "bg-red-500",
        lineColor: "border-red-200 dark:border-red-700/50",
      };
    default:
      return {
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        label: type,
        dotColor: "bg-slate-500",
        lineColor: "border-slate-200 dark:border-white/10",
      };
  }
}

// ─── Payload body renderer ─────────────────────────────────────────────────

function eventBody(event: ApprovalEventRow): string | null {
  const p = event.payload as Record<string, unknown>;
  switch (event.event_type) {
    case "status_changed":
      return `${String(p.from_status ?? "?")} → ${String(p.to_status ?? "?")}`;
    case "snapshot_created":
      return `v${String(p.version ?? 1)} · ₹${Number(p.final_amount_inr ?? 0).toLocaleString("en-IN")} · ${p.system_kw} kW`;
    case "pricing_revised":
      return `₹${Number(p.previous_final_inr ?? 0).toLocaleString("en-IN")} → ₹${Number(p.new_final_inr ?? 0).toLocaleString("en-IN")}`;
    case "discount_applied":
      return `₹${Number(p.discount_inr ?? 0).toLocaleString("en-IN")} discount (${Number(p.discount_pct ?? 0).toFixed(1)}%)`;
    case "project_created":
      return p.capacity_kw ? `${p.capacity_kw} kW system` : null;
    case "approval_granted":
    case "approval_rejected": {
      const d = p as { decision?: string; reason?: string; approved_by?: string };
      return [d.approved_by, d.reason].filter(Boolean).join(" · ") || null;
    }
    default:
      return null;
  }
}

// ─── Time formatting ───────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  try {
    const ms = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function absoluteTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export type WorkspaceActivityTabProps = {
  timeline: ApprovalEventRow[];
};

export function WorkspaceActivityTab({ timeline }: WorkspaceActivityTabProps) {
  const events = useMemo(() => [...timeline].reverse(), [timeline]);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-12 text-center dark:border-white/10 dark:bg-[#0c1017]">
        <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No activity recorded yet</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Activity is logged when you send the proposal, update pricing, or change status.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017] sm:p-6">
      <p className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Activity timeline
      </p>
      <ol className="space-y-0" aria-label="Proposal activity timeline">
        {events.map((event, i) => {
          const cfg = eventConfig(event.event_type);
          const body = eventBody(event);
          const isLast = i === events.length - 1;
          return (
            <motion.li
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
              className="relative flex gap-3"
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  className="absolute left-[0.9375rem] top-7 w-px bg-slate-100 dark:bg-white/10"
                  style={{ bottom: 0 }}
                  aria-hidden
                />
              )}

              {/* Icon dot */}
              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full text-white",
                  cfg.dotColor
                )}
                style={{ width: "1.875rem", height: "1.875rem" }}
                aria-hidden
              >
                {cfg.icon}
              </div>

              {/* Content */}
              <div className={cn("min-w-0 flex-1 pb-5", isLast && "pb-0")}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {cfg.label}
                  </span>
                  {event.actor && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      by {event.actor}
                    </span>
                  )}
                </div>
                {body && (
                  <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">{body}</p>
                )}
                <p
                  className="mt-1 text-[11px] text-slate-400 dark:text-slate-500"
                  title={absoluteTime(event.occurred_at)}
                >
                  {relativeTime(event.occurred_at)}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
