"use client";

/**
 * HubPipelineBoard — E3 Kanban-style pipeline view for /proposals.
 *
 * Layout:
 *   - Horizontal scroll on mobile/tablet
 *   - 5 columns: draft → sent → viewed → negotiation → approved
 *   - Each column: header (status label + count + total ₹) + scrollable card list
 *   - Cards use DealCard density="pipeline"
 *
 * State:
 *   - No drag-and-drop yet (E5+). Cards are clickable to set focusId.
 *   - Column totals are computed from visible rows.
 *   - Empty columns show a minimal placeholder.
 *
 * Visual language:
 *   - Commercial proposals: violet left border
 *   - Residential: teal accent
 *   - Approved column: emerald tinted header
 *   - Draft column: muted slate toned header
 */

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DealCard } from "@/components/proposals/deal-card";
import { formatInrCompact, statusVisualLight } from "@/lib/proposal-hub-insights";
import type { ProposalHubRow } from "@/lib/proposal-hub-insights";
import { normalizeProposalStatus, PROPOSAL_STATUS_ORDER, type ProposalStatus } from "@/lib/proposal-status";

// ─── Column labels ────────────────────────────────────────────────────────────

const COLUMN_LABELS: Record<ProposalStatus, { title: string; emoji: string }> = {
  draft:       { title: "Draft",       emoji: "✏️" },
  sent:        { title: "Sent",        emoji: "📤" },
  viewed:      { title: "Viewed",      emoji: "👁️" },
  negotiation: { title: "Negotiation", emoji: "🤝" },
  approved:    { title: "Won",         emoji: "✅" },
};

// ─── Column header ────────────────────────────────────────────────────────────

function ColumnHeader({
  status,
  count,
  totalInr,
}: {
  status: ProposalStatus;
  count: number;
  totalInr: number;
}) {
  const vis = statusVisualLight(status);
  const meta = COLUMN_LABELS[status];

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5",
        vis.bg,
        vis.border,
        "border"
      )}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-sm">{meta.emoji}</span>
        <span className={cn("text-[11px] font-bold uppercase tracking-[0.15em]", vis.text)}>
          {meta.title}
        </span>
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black tabular-nums",
            vis.bg, vis.text
          )}
        >
          {count}
        </span>
      </div>
      {totalInr > 0 && (
        <span className={cn("text-[10px] font-bold tabular-nums", vis.text)}>
          {formatInrCompact(totalInr)}
        </span>
      )}
    </div>
  );
}

// ─── Empty column ─────────────────────────────────────────────────────────────

function EmptyColumn({ status }: { status: ProposalStatus }) {
  const meta = COLUMN_LABELS[status];
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/8">
      <div className="text-center">
        <span aria-hidden className="text-2xl opacity-30">{meta.emoji}</span>
        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
          No {meta.title.toLowerCase()} deals
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HubPipelineBoard({
  rows,
  focusId,
  onSelect,
  lang = "en",
  className,
}: {
  rows: ProposalHubRow[];
  focusId: string | null;
  onSelect: (id: string) => void;
  lang?: "en" | "hi";
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group rows by status
  const grouped = new Map<ProposalStatus, ProposalHubRow[]>();
  for (const st of PROPOSAL_STATUS_ORDER) grouped.set(st, []);
  for (const row of rows) {
    const st = normalizeProposalStatus(row.proposal_status);
    grouped.get(st)?.push(row);
  }

  // Column totals
  function columnTotal(status: ProposalStatus): number {
    return (grouped.get(status) ?? []).reduce((sum, r) => {
      const v = r.final_amount_inr;
      return sum + (v != null && Number.isFinite(v) ? v : 0);
    }, 0);
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex gap-4 overflow-x-auto overscroll-x-contain pb-4",
        "[-webkit-overflow-scrolling:touch]",
        "snap-x snap-mandatory lg:snap-none",
        className
      )}
      aria-label="Proposal pipeline"
    >
      {(PROPOSAL_STATUS_ORDER as ProposalStatus[]).map((status: ProposalStatus, colIdx: number) => {
        const bucket = grouped.get(status) ?? [];
        const total = columnTotal(status);

        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: colIdx * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "flex w-[17.5rem] shrink-0 snap-start flex-col gap-3",
              "sm:w-[18rem]",
              // On lg+, grow columns to fill available space evenly
              "lg:min-w-[15rem] lg:flex-1"
            )}
          >
            {/* Column header */}
            <ColumnHeader status={status} count={bucket.length} totalInr={total} />

            {/* Card list or empty placeholder */}
            <div className="flex flex-col gap-3">
              {bucket.length === 0 ? (
                <EmptyColumn status={status} />
              ) : (
                bucket.map((row, cardIdx) => (
                  <DealCard
                    key={row.id}
                    row={row}
                    density="pipeline"
                    active={row.id === focusId}
                    lang={lang}
                    onClick={onSelect}
                    delay={cardIdx}
                  />
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
