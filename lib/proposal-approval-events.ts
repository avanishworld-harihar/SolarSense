/**
 * Proposal approval event log — append-only commercial timeline.
 *
 * Every significant pricing, status, or commercial decision on a proposal
 * is recorded here as an immutable event. This is the audit trail for:
 *   - status transitions  (draft → sent → approved)
 *   - pricing revisions   (discount applied, line item changed)
 *   - snapshot creation   (frozen pricing versions)
 *   - approval decisions  (granted / rejected)
 *   - project creation    (CRM handover)
 *
 * Architectural invariant: NEVER update or delete events. Only append.
 * The timeline is the source of truth for "what happened to this proposal."
 *
 * Failure semantics: appendApprovalEvent is fire-and-forget.
 * A failed event write MUST NOT block the calling operation.
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

function rwClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

// ─── Event type registry ─────────────────────────────────────────────────────

export const APPROVAL_EVENT_TYPES = [
  /** Proposal status changed (draft → sent → viewed → negotiation → approved). */
  "status_changed",
  /** A new immutable pricing snapshot was created. */
  "snapshot_created",
  /** Pricing was revised after initial creation (line items or discount changed). */
  "pricing_revised",
  /** A discount was explicitly applied or modified. */
  "discount_applied",
  /** A CRM project was created from this proposal. */
  "project_created",
  /** A discount or override approval was requested. */
  "approval_requested",
  /** An approval was granted by a manager. */
  "approval_granted",
  /** An approval was rejected. */
  "approval_rejected",
] as const;

export type ApprovalEventType = (typeof APPROVAL_EVENT_TYPES)[number];

// ─── Typed payload shapes ─────────────────────────────────────────────────────

export type StatusChangedPayload = {
  from_status: string;
  to_status: string;
};

export type SnapshotCreatedPayload = {
  snapshot_id: string;
  version: number;
  triggered_by: string;
  final_amount_inr: number;
  system_kw: number;
};

export type PricingRevisedPayload = {
  previous_final_inr: number;
  new_final_inr: number;
  delta_inr: number;
  field_changed?: string;
};

export type DiscountAppliedPayload = {
  discount_inr: number;
  previous_final_inr: number;
  new_final_inr: number;
  discount_pct: number;
};

export type ProjectCreatedPayload = {
  project_id: string;
  lead_id?: string;
  capacity_kw?: number;
};

export type ApprovalDecisionPayload = {
  decision: "granted" | "rejected";
  reason?: string;
  discount_inr?: number;
  approved_by?: string;
};

export type ApprovalPayload =
  | StatusChangedPayload
  | SnapshotCreatedPayload
  | PricingRevisedPayload
  | DiscountAppliedPayload
  | ProjectCreatedPayload
  | ApprovalDecisionPayload
  | Record<string, unknown>;

// ─── Event row ───────────────────────────────────────────────────────────────

export type ApprovalEventRow = {
  id: string;
  proposal_id: string;
  event_type: ApprovalEventType;
  payload: ApprovalPayload;
  actor: string | null;
  occurred_at: string;
};

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Appends an event to the proposal's commercial timeline.
 *
 * This is intentionally fire-and-forget: never await the return value
 * in the critical path. Failures are logged but do not surface to callers.
 *
 * Usage:
 *   void appendApprovalEvent(proposalId, "status_changed", { from_status: "draft", to_status: "sent" });
 */
export async function appendApprovalEvent(
  proposalId: string,
  eventType: ApprovalEventType,
  payload: ApprovalPayload = {},
  actor?: string
): Promise<void> {
  const client = rwClient();
  if (!client) return;
  try {
    await client.from("proposal_approval_events").insert({
      proposal_id: proposalId,
      event_type: eventType,
      payload: payload as Record<string, unknown>,
      actor: actor ?? null,
    });
  } catch (err) {
    // Table may not exist in pre-migration environments — silent degradation.
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist|relation/i.test(msg)) {
      console.warn("[proposal-approval-events] append:", msg);
    }
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all events for a proposal, oldest first.
 * Returns empty array if table doesn't exist yet (pre-migration environments).
 */
export async function getApprovalTimeline(proposalId: string): Promise<ApprovalEventRow[]> {
  const client = rwClient();
  if (!client) return [];
  const { data, error } = await client
    .from("proposal_approval_events")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("occurred_at", { ascending: true });
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[proposal-approval-events] timeline:", error.message);
    }
    return [];
  }
  return (data ?? []) as ApprovalEventRow[];
}

/**
 * Returns only events matching a specific type (e.g. all status changes).
 */
export async function getEventsByType(
  proposalId: string,
  eventType: ApprovalEventType
): Promise<ApprovalEventRow[]> {
  const client = rwClient();
  if (!client) return [];
  const { data, error } = await client
    .from("proposal_approval_events")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("event_type", eventType)
    .order("occurred_at", { ascending: true });
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[proposal-approval-events] getByType:", error.message);
    }
    return [];
  }
  return (data ?? []) as ApprovalEventRow[];
}
