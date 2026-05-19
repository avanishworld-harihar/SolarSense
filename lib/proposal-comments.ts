/**
 * Proposal Comments — Wave 4 P9.
 *
 * Block-anchored async commenting with @mention support.
 *
 * Architecture:
 *   - Stored in public.proposal_comments (see 027_proposal_comments.sql)
 *   - Append-only body: comment body is immutable once created
 *   - Soft-delete: is_deleted flag only — rows are never hard-deleted
 *   - @mention encoding: @[Author Name](uuid) — parsed by the UI
 *   - Block anchor: optional block_id links a comment to a specific block
 *
 * Failure semantics: addComment is non-blocking.
 * A write failure MUST NOT crash the calling workflow.
 */

import { supabase } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

function rwClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommentRow = {
  id: string;
  proposal_id: string;
  /** Block ID anchor (from proposal-block-registry). Null = proposal-level. */
  block_id: string | null;
  org_user_id: string | null;
  author_name: string;
  /** Plain text body — @mentions encoded as @[Name](uuid) */
  body: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
};

export type AddCommentInput = {
  proposal_id: string;
  block_id?: string | null;
  org_user_id?: string | null;
  author_name: string;
  body: string;
};

// ─── @mention parser ──────────────────────────────────────────────────────────

export type Mention = { name: string; userId: string };

/**
 * Parses @[Name](uuid) tokens from a comment body.
 * Returns an array of all mentions found.
 */
export function parseMentions(body: string): Mention[] {
  const re = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g;
  const mentions: Mention[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    mentions.push({ name: m[1], userId: m[2] });
  }
  return mentions;
}

/**
 * Formats a mention token for embedding in comment body.
 */
export function formatMention(name: string, userId: string): string {
  return `@[${name}](${userId})`;
}

/**
 * Returns the comment body with mention tokens replaced by plain "@Name" text.
 * Useful for notifications and plain-text display.
 */
export function stripMentionTokens(body: string): string {
  return body.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, "@$1");
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Returns all visible (non-deleted) comments for a proposal,
 * ordered by created_at ASC (chronological).
 * Optionally filtered to a specific block_id anchor.
 */
export async function getComments(
  proposalId: string,
  blockId?: string | null
): Promise<CommentRow[]> {
  const client = rwClient();
  if (!client) return [];

  let query = client
    .from("proposal_comments")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (blockId !== undefined) {
    query = blockId ? query.eq("block_id", blockId) : query.is("block_id", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[proposal-comments] getComments error:", error.message);
    return [];
  }
  return (data ?? []) as CommentRow[];
}

/**
 * Returns the count of unresolved, non-deleted comments for a proposal.
 * Used by the inbox bell badge.
 */
export async function getUnresolvedCommentCount(proposalId: string): Promise<number> {
  const client = rwClient();
  if (!client) return 0;

  const { count, error } = await client
    .from("proposal_comments")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId)
    .eq("is_resolved", false)
    .eq("is_deleted", false);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Returns the count of all unresolved comments across all proposals.
 * Used by the global inbox bell in TopBar.
 */
export async function getGlobalUnresolvedCount(): Promise<number> {
  const client = rwClient();
  if (!client) return 0;

  const { count, error } = await client
    .from("proposal_comments")
    .select("id", { count: "exact", head: true })
    .eq("is_resolved", false)
    .eq("is_deleted", false);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Adds a comment. Non-blocking: errors are logged but not thrown.
 * Returns the created CommentRow on success, or null on failure.
 */
export async function addComment(input: AddCommentInput): Promise<CommentRow | null> {
  const client = rwClient();
  if (!client) return null;

  const trimmed = input.body.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2000) {
    console.warn("[proposal-comments] body exceeds 2000 chars — truncating");
  }

  const { data, error } = await client
    .from("proposal_comments")
    .insert({
      proposal_id: input.proposal_id,
      block_id: input.block_id ?? null,
      org_user_id: input.org_user_id ?? null,
      author_name: input.author_name,
      body: trimmed.slice(0, 2000),
    })
    .select()
    .single();

  if (error) {
    console.error("[proposal-comments] addComment error:", error.message);
    return null;
  }
  return data as CommentRow;
}

/**
 * Marks a comment as resolved.
 * Immutable: only the resolved state can change, not the body.
 */
export async function resolveComment(
  commentId: string,
  resolvedBy?: string | null
): Promise<boolean> {
  const client = rwClient();
  if (!client) return false;

  const { error } = await client
    .from("proposal_comments")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy ?? null,
    })
    .eq("id", commentId);

  if (error) {
    console.error("[proposal-comments] resolveComment error:", error.message);
    return false;
  }
  return true;
}

/**
 * Soft-deletes a comment.
 * The row is retained in the database for audit; the UI hides it.
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const client = rwClient();
  if (!client) return false;

  const { error } = await client
    .from("proposal_comments")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) {
    console.error("[proposal-comments] deleteComment error:", error.message);
    return false;
  }
  return true;
}
