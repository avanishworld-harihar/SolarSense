import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import { proposalStatusSchema, type ProposalStatus } from "@/lib/proposal-status";
import { deleteProposal, getProposalById, trackProposalView, updateProposalStatus } from "@/lib/proposals-store";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { appendApprovalEvent } from "@/lib/proposal-approval-events";
import {
  createPricingSnapshot,
  createAndAcceptSnapshot,
  getLatestSnapshot,
} from "@/lib/proposal-snapshot-store";
import { upsertPipelineProject } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const patchBodySchema = z.object({
  proposal_status: proposalStatusSchema,
  /** Optional actor identifier (future auth — user email / id). */
  actor: z.string().max(200).optional(),
});

// ─── Lifecycle side-effects ───────────────────────────────────────────────────

/**
 * Called when status transitions to "sent".
 * Creates an immutable v1 pricing snapshot of the current working draft.
 * Fire-and-forget: failures log but do not block the status update.
 */
async function onProposalSent(proposalId: string, fromStatus: string, actor?: string): Promise<void> {
  try {
    const pricing = await getProposalPricingByProposalId(proposalId);
    if (!pricing) return;

    // Only create a new snapshot if one doesn't exist yet for this proposal
    // (prevents duplicate v1 on repeated sent→draft→sent cycles).
    const latest = await getLatestSnapshot(proposalId);
    const isFirstSend = !latest;

    const snap = await createPricingSnapshot(
      proposalId,
      pricing,
      isFirstSend ? "sent" : "revised",
      actor
    );

    if (snap) {
      void appendApprovalEvent(
        proposalId,
        "snapshot_created",
        {
          snapshot_id: snap.id,
          version: snap.version,
          triggered_by: snap.triggered_by,
          final_amount_inr: pricing.final_amount_inr,
          system_kw: pricing.system_kw,
        },
        actor
      );
    }

    void appendApprovalEvent(
      proposalId,
      "status_changed",
      { from_status: fromStatus, to_status: "sent" },
      actor
    );
  } catch (err) {
    console.warn("[proposals/[id] PATCH] onProposalSent side-effect:", err instanceof Error ? err.message : err);
  }
}

/**
 * Called when status transitions to "approved".
 * - Accepts (or creates + accepts) a pricing snapshot.
 * - Records the approval event.
 * - Ensures a project pipeline card exists.
 */
async function onProposalApproved(
  proposalId: string,
  fromStatus: string,
  proposal: Awaited<ReturnType<typeof getProposalById>>,
  actor?: string
): Promise<{ projectId: string | null }> {
  if (!proposal) return { projectId: null };

  let projectId: string | null = null;

  try {
    const pricing = await getProposalPricingByProposalId(proposalId);
    if (pricing) {
      // Accept the latest snapshot, or create one if none exists yet.
      const latest = await getLatestSnapshot(proposalId);
      if (latest) {
        const { acceptSnapshot } = await import("@/lib/proposal-snapshot-store");
        await acceptSnapshot(latest.id, proposalId);
        void appendApprovalEvent(
          proposalId,
          "approval_granted",
          {
            decision: "granted",
            // Reference the snapshot that was accepted.
            snapshot_id: latest.id,
          } as Record<string, unknown>,
          actor
        );
      } else {
        await createAndAcceptSnapshot(proposalId, pricing, actor);
        void appendApprovalEvent(
          proposalId,
          "approval_granted",
          { decision: "granted" } as Record<string, unknown>,
          actor
        );
      }
    }

    void appendApprovalEvent(
      proposalId,
      "status_changed",
      { from_status: fromStatus, to_status: "approved" },
      actor
    );

    // Ensure a Project pipeline card exists.
    if (proposal.lead_id) {
      try {
        const project = await upsertPipelineProject({
          lead_id: proposal.lead_id,
          official_name: proposal.customer_name,
          capacity_kw: `${proposal.ppt_input?.systemKw ?? ""} kW`,
          detail: proposal.location?.trim() || undefined,
          status: "pending",
          install_progress: 20,
          next_action: "Material planning",
        });
        if (project && typeof project["id"] === "string") {
          projectId = project["id"] as string;
          void appendApprovalEvent(
            proposalId,
            "project_created",
            {
              project_id: projectId,
              lead_id: proposal.lead_id,
              capacity_kw: proposal.ppt_input?.systemKw,
            },
            actor
          );
        }
      } catch (err) {
        console.warn("[proposals/[id] PATCH] onApproved project upsert:", err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.warn("[proposals/[id] PATCH] onProposalApproved side-effect:", err instanceof Error ? err.message : err);
  }

  return { projectId };
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id || !UUID_RX.test(id.trim())) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }
    const proposal = await getProposalById(id.trim());
    if (!proposal) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const ok = await deleteProposal(proposal.id);
    if (!ok) return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 503 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "delete_failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id || !UUID_RX.test(id.trim())) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }
    const raw = await req.json();
    const body = patchBodySchema.parse(raw);
    const proposal = await getProposalById(id.trim());
    if (!proposal) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const fromStatus = proposal.proposal_status ?? "draft";
    const toStatus: ProposalStatus = body.proposal_status;
    const actor = body.actor;

    // Persist the status change first.
    const ok = await updateProposalStatus(proposal.id, toStatus);
    if (!ok) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 503 });

    // Lifecycle side-effects — fire-and-forget, never block response.
    let projectId: string | null = null;

    if (toStatus === "sent" && fromStatus !== "sent") {
      void onProposalSent(proposal.id, fromStatus, actor);
    } else if (toStatus === "approved") {
      const result = await onProposalApproved(proposal.id, fromStatus, proposal, actor);
      projectId = result.projectId;
    } else if (toStatus !== fromStatus) {
      // Record all other status transitions as events.
      void appendApprovalEvent(
        proposal.id,
        "status_changed",
        { from_status: fromStatus, to_status: toStatus },
        actor
      );
    }

    return NextResponse.json(
      { ok: true, proposal_status: toStatus, projectId },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
        : error instanceof Error
          ? error.message
          : "patch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    const proposal = await getProposalById(id);
    if (!proposal) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const pricing = await getProposalPricingByProposalId(proposal.id);
    const mergedInput = mergeProposalPricingIntoPptInput(proposal.ppt_input, pricing);
    const liveSummary = summarizeProposalDeck(mergedInput);

    // Fire-and-forget view counter.
    void trackProposalView(id).catch(() => undefined);

    return NextResponse.json(
      {
        ok: true,
        id: proposal.id,
        customerName: proposal.customer_name,
        generatedAt: proposal.generated_at,
        presetId: proposal.preset_id ?? "residential_smart",
        acceptedSnapshotId: proposal.accepted_snapshot_id ?? null,
        installer: {
          name: proposal.installer_name,
          contact: proposal.installer_contact,
          tagline: proposal.installer_tagline,
        },
        viewCount: proposal.view_count,
        summary: liveSummary,
        pptInput: mergedInput,
        pricing,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "fetch_failed" },
      { status: 500 }
    );
  }
}
