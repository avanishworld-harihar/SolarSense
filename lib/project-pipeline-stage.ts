/**
 * Installation / operations stage — inferred from pipeline row text + progress.
 * No DB migration; heuristics align field teams to a Kanban mental model.
 */

import type { PipelineProjectRow } from "@/lib/supabase";

export const OPS_STAGE_ORDER = [
  "survey",
  "design",
  "approval",
  "installation",
  "net_metering",
  "completed",
  "service"
] as const;

export type OpsStageId = (typeof OPS_STAGE_ORDER)[number];

type RowSlice = Pick<PipelineProjectRow, "status" | "next_action" | "detail" | "install_progress">;

/** i18n: `projects_opsStage_${id}` */
export function inferOpsStage(row: RowSlice): OpsStageId {
  const s = (row.status || "").toLowerCase();
  const na = (row.next_action || "").toLowerCase();
  const d = (row.detail || "").toLowerCase();
  const blob = `${na} ${d} ${s}`;
  const p = Math.min(100, Math.max(0, Number(row.install_progress) || 0));

  if (s.includes("done") || s.includes("complete") || p >= 98) return "completed";
  if (/\bamc\b|service visit|annual maintenance|post.?install service/.test(blob)) return "service";
  if (/net\s*met|net[- ]?meter|bi[- ]?directional|bidirectional|feed.in/.test(blob)) return "net_metering";
  if (/install|commissioning|mounting|racking|module fix|civil work|structure erection/.test(blob) || p >= 55) {
    return "installation";
  }
  if (/approval|sanction|discom|load enhancement|feasibility|tni/.test(blob) || (p >= 30 && p < 55)) {
    return "approval";
  }
  if (/design|drawing|sld|single.?line|layout engineering|structural/.test(blob) || (p >= 12 && p < 30)) {
    return "design";
  }
  return "survey";
}
