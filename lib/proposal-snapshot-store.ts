/**
 * Proposal pricing snapshot store.
 *
 * Snapshots are IMMUTABLE rows in `proposal_pricing_snapshots`.
 * They are created when a proposal transitions to specific lifecycle states:
 *   - "sent"     → v1 snapshot (the offer the customer received)
 *   - "revised"  → v2+ snapshots (re-quoted offer)
 *   - "approved" → accepted_snapshot_id is set on the proposal
 *   - "manual"   → installer explicitly saves a pricing version
 *
 * Architectural invariant: once created, a snapshot_data row is NEVER updated.
 * Corrections create new snapshot versions. This is the audit foundation.
 *
 * The `accepted_snapshot_id` column on `proposals` is the customer contract reference.
 * It is set once (on approval) and should never be changed after that.
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { proposalPricingRowSchema, type ProposalPricingRow } from "@/lib/proposal-pricing-schema";

type Row = Record<string, unknown>;

function rwClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export const SNAPSHOT_TRIGGERS = ["sent", "approved", "revised", "manual"] as const;
export type SnapshotTrigger = (typeof SNAPSHOT_TRIGGERS)[number];

export type PricingSnapshotRow = {
  id: string;
  proposal_id: string;
  version: number;
  /** Full ProposalPricingRow payload — frozen at creation time. */
  snapshot_data: ProposalPricingRow;
  triggered_by: SnapshotTrigger;
  created_at: string;
  created_by: string | null;
  is_accepted: boolean;
};

// ─── Internal parse ──────────────────────────────────────────────────────────

function parseSnapshot(raw: Row): PricingSnapshotRow | null {
  try {
    const data = proposalPricingRowSchema.safeParse(raw.snapshot_data);
    if (!data.success) {
      console.warn("[proposal-snapshot-store] invalid snapshot_data:", data.error.issues[0]?.message);
      return null;
    }
    const trigger = SNAPSHOT_TRIGGERS.includes(raw.triggered_by as SnapshotTrigger)
      ? (raw.triggered_by as SnapshotTrigger)
      : "manual";
    return {
      id: String(raw.id),
      proposal_id: String(raw.proposal_id),
      version: Number(raw.version) || 1,
      snapshot_data: data.data,
      triggered_by: trigger,
      created_at: String(raw.created_at ?? ""),
      created_by: raw.created_by != null ? String(raw.created_by) : null,
      is_accepted: Boolean(raw.is_accepted),
    };
  } catch {
    return null;
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** All snapshots for a proposal, newest version first. */
export async function getSnapshotsByProposalId(proposalId: string): Promise<PricingSnapshotRow[]> {
  const client = rwClient();
  if (!client) return [];
  const { data, error } = await client
    .from("proposal_pricing_snapshots")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("version", { ascending: false });
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[proposal-snapshot-store] getByProposal:", error.message);
    }
    return [];
  }
  return (data as Row[]).flatMap((r) => {
    const s = parseSnapshot(r);
    return s ? [s] : [];
  });
}

/** Most recent snapshot (highest version number) for a proposal. */
export async function getLatestSnapshot(proposalId: string): Promise<PricingSnapshotRow | null> {
  const client = rwClient();
  if (!client) return null;
  const { data, error } = await client
    .from("proposal_pricing_snapshots")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[proposal-snapshot-store] getLatest:", error.message);
    }
    return null;
  }
  return data ? parseSnapshot(data as Row) : null;
}

/** The snapshot that the customer accepted. Null until `acceptSnapshot` is called. */
export async function getAcceptedSnapshot(proposalId: string): Promise<PricingSnapshotRow | null> {
  const client = rwClient();
  if (!client) return null;
  const { data, error } = await client
    .from("proposal_pricing_snapshots")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("is_accepted", true)
    .maybeSingle();
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[proposal-snapshot-store] getAccepted:", error.message);
    }
    return null;
  }
  return data ? parseSnapshot(data as Row) : null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Creates an immutable snapshot of the current pricing row.
 *
 * Auto-increments the version number by reading the current max.
 * If `proposal_pricing_snapshots` table doesn't exist yet (pre-migration),
 * returns null silently so callers degrade gracefully.
 */
export async function createPricingSnapshot(
  proposalId: string,
  pricingRow: ProposalPricingRow,
  triggeredBy: SnapshotTrigger = "sent",
  actor?: string
): Promise<PricingSnapshotRow | null> {
  const client = rwClient();
  if (!client) return null;

  // Determine next version number.
  const latest = await getLatestSnapshot(proposalId);
  const nextVersion = (latest?.version ?? 0) + 1;

  const payload: Row = {
    proposal_id: proposalId,
    version: nextVersion,
    snapshot_data: pricingRow as unknown as Row,
    triggered_by: triggeredBy,
    created_by: actor ?? null,
    is_accepted: false,
  };

  const { data, error } = await client
    .from("proposal_pricing_snapshots")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    // Table doesn't exist in this environment yet — degrade gracefully.
    if (/does not exist|relation/i.test(error.message)) return null;
    console.warn("[proposal-snapshot-store] create:", error.message);
    return null;
  }

  return data ? parseSnapshot(data as Row) : null;
}

/**
 * Marks a snapshot as accepted and points `proposals.accepted_snapshot_id` to it.
 *
 * This represents "customer has signed off / approved this commercial offer."
 * The `accepted_snapshot_id` becomes the immutable contract reference.
 *
 * Only one snapshot can be accepted per proposal at any time.
 * Calling this again replaces the previous accepted pointer (rare: corrective approval).
 */
export async function acceptSnapshot(snapshotId: string, proposalId: string): Promise<boolean> {
  const client = rwClient();
  if (!client) return false;

  try {
    // Clear any previous accepted flag on this proposal.
    await client
      .from("proposal_pricing_snapshots")
      .update({ is_accepted: false })
      .eq("proposal_id", proposalId)
      .eq("is_accepted", true);

    // Mark this snapshot as accepted.
    const { error: flagErr } = await client
      .from("proposal_pricing_snapshots")
      .update({ is_accepted: true })
      .eq("id", snapshotId);

    if (flagErr) {
      console.warn("[proposal-snapshot-store] acceptSnapshot flag:", flagErr.message);
      return false;
    }

    // Set the canonical pointer on the proposal.
    const { error: propErr } = await client
      .from("proposals")
      .update({ accepted_snapshot_id: snapshotId })
      .eq("id", proposalId);

    if (propErr) {
      // Column may not exist pre-migration — degrade gracefully.
      if (!/column|does not exist/i.test(propErr.message)) {
        console.warn("[proposal-snapshot-store] acceptSnapshot proposal update:", propErr.message);
      }
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[proposal-snapshot-store] acceptSnapshot:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Convenience: create a snapshot and immediately accept it in one call.
 * Used when "approved" status transition happens without a prior "sent" snapshot.
 */
export async function createAndAcceptSnapshot(
  proposalId: string,
  pricingRow: ProposalPricingRow,
  actor?: string
): Promise<PricingSnapshotRow | null> {
  const snap = await createPricingSnapshot(proposalId, pricingRow, "approved", actor);
  if (!snap) return null;
  await acceptSnapshot(snap.id, proposalId);
  return snap;
}
