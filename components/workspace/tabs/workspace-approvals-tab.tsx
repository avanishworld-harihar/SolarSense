"use client";

/**
 * WorkspaceApprovalsTab — immutable pricing snapshot history + approval decisions.
 *
 * Shows:
 *  - Each PricingSnapshotRow as a version card (v1, v2, …)
 *  - Accepted snapshot highlighted with a green badge
 *  - Key figures from snapshot_data (system size, net cost, subsidy, payback)
 *  - Trigger label (how the snapshot was created)
 *  - Approval decision events extracted from timeline
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, CheckCircle2 } from "lucide-react";
import type { PricingSnapshotRow } from "@/lib/proposal-snapshot-store";
import type { ApprovalEventRow } from "@/lib/proposal-approval-events";
import { cn } from "@/lib/utils";

// ─── Helpers ───────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  sent: "Created on send",
  approved: "Created on approval",
  revised: "Revised quote",
  manual: "Manual save",
};

function formatTs(isoString: string): string {
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

// ─── Snapshot card ─────────────────────────────────────────────────────────

function SnapshotCard({
  snap,
  isAccepted,
  delay,
}: {
  snap: PricingSnapshotRow;
  isAccepted: boolean;
  delay: number;
}) {
  const d = snap.snapshot_data;
  const net = d.final_amount_inr ?? d.hardware_inr ?? null;
  const kw = d.system_kw;
  const subsidy = d.subsidy_inr ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        isAccepted
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-500/10"
          : "border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#0c1017]"
      )}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg text-white",
              isAccepted ? "bg-emerald-500" : "bg-violet-500"
            )}
            aria-hidden
          >
            {isAccepted ? (
              <BadgeCheck className="h-4 w-4" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Version {snap.version}
            </span>
            {isAccepted && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Accepted
              </span>
            )}
          </div>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {formatTs(snap.created_at)}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            System
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {kw} kW
          </p>
        </div>
        {net != null && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Net payable
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              ₹{Math.round(net).toLocaleString("en-IN")}
            </p>
          </div>
        )}
        {subsidy != null && subsidy > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Subsidy
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              ₹{Math.round(subsidy).toLocaleString("en-IN")}
            </p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Trigger
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            {TRIGGER_LABELS[snap.triggered_by] ?? snap.triggered_by}
          </p>
        </div>
      </div>

      {snap.created_by && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Created by {snap.created_by}
        </p>
      )}
    </motion.div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export type WorkspaceApprovalsTabProps = {
  snapshots: PricingSnapshotRow[];
  timeline: ApprovalEventRow[];
};

export function WorkspaceApprovalsTab({ snapshots, timeline }: WorkspaceApprovalsTabProps) {
  const approvalEvents = useMemo(
    () => timeline.filter((e) => e.event_type === "approval_granted" || e.event_type === "approval_rejected"),
    [timeline]
  );

  if (snapshots.length === 0 && approvalEvents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-12 text-center dark:border-white/10 dark:bg-[#0c1017]">
        <Camera className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No snapshots yet</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Pricing snapshots are created automatically when the proposal is sent or approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Snapshots */}
      {snapshots.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pricing snapshots
          </p>
          <div className="space-y-3">
            {snapshots.map((snap, i) => (
              <SnapshotCard
                key={snap.id}
                snap={snap}
                isAccepted={snap.is_accepted}
                delay={i * 0.05}
              />
            ))}
          </div>
        </section>
      )}

      {/* Approval decisions */}
      {approvalEvents.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Approval decisions
          </p>
          <div className="space-y-3">
            {approvalEvents.map((event, i) => {
              const granted = event.event_type === "approval_granted";
              const p = event.payload as { reason?: string; approved_by?: string; discount_inr?: number };
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
                  className={cn(
                    "rounded-2xl border p-4 sm:p-5",
                    granted
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-500/10"
                      : "border-red-200 bg-red-50 dark:border-red-700/40 dark:bg-red-500/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BadgeCheck
                      className={cn("h-4 w-4", granted ? "text-emerald-600" : "text-red-600")}
                    />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {granted ? "Approval granted" : "Approval rejected"}
                    </span>
                  </div>
                  {p.reason && (
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{p.reason}</p>
                  )}
                  {p.approved_by && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      by {p.approved_by}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {formatTs(event.occurred_at)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
