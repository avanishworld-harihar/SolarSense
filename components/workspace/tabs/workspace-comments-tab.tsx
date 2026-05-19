"use client";

/**
 * WorkspaceCommentsTab — Wave 4 P9.
 *
 * Block-anchored async comments panel for the /workspace/[id] Comments tab.
 *
 * Features:
 *   - Shows all proposal-level + block-anchored comments in chronological order
 *   - Compose new comments with @mention support (encoded as @[Name](uuid))
 *   - Resolve + soft-delete controls per comment
 *   - Realtime polling (5s interval) — kept lightweight (no Supabase channel yet)
 *   - Presence upgrade comes in P9 Phase 2 (presence-stack)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AtSign,
  CheckCircle2,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
import {
  addComment,
  deleteComment,
  getComments,
  resolveComment,
  stripMentionTokens,
  type CommentRow,
} from "@/lib/proposal-comments";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  proposalId: string;
  /** The current user's display name (author_name for new comments) */
  authorName?: string;
};

// ─── Comment bubble ───────────────────────────────────────────────────────────

function CommentBubble({
  comment,
  onResolve,
  onDelete,
}: {
  comment: CommentRow;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const displayBody = stripMentionTokens(comment.body);
  const time = new Date(comment.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const date = new Date(comment.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`group rounded-xl border p-3 transition-colors ${
        comment.is_resolved
          ? "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20"
          : "border-slate-200 bg-white dark:border-white/8 dark:bg-white/[0.03]"
      }`}
    >
      {/* Block anchor pill */}
      {comment.block_id && (
        <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-400">
          <AtSign className="h-2.5 w-2.5" />
          {comment.block_id.replace(/_/g, " ")}
        </span>
      )}

      {/* Author row */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {comment.author_name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">
            {comment.author_name}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {date} {time}
        </span>
      </div>

      {/* Body */}
      <p className="ml-8 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
        {displayBody}
      </p>

      {/* Actions */}
      <div className="ml-8 mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!comment.is_resolved && (
          <button
            onClick={() => onResolve(comment.id)}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <CheckCircle2 className="h-3 w-3" />
            Resolve
          </button>
        )}
        {comment.is_resolved && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        )}
        <button
          onClick={() => onDelete(comment.id)}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </motion.div>
  );
}

// ─── Compose box ──────────────────────────────────────────────────────────────

function ComposeBox({
  onSubmit,
  disabled,
}: {
  onSubmit: (body: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await onSubmit(trimmed);
    setBody("");
    setSubmitting(false);
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/8 dark:bg-white/[0.03]">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled || submitting}
        placeholder="Add a comment… Ctrl+Enter to send"
        rows={3}
        className="w-full resize-none rounded-t-xl bg-transparent px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-600"
        maxLength={2000}
      />
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-white/5">
        <span className="text-[10px] text-slate-400 dark:text-slate-600">
          {body.length} / 2000
        </span>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!body.trim() || submitting}
          className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <Send className="h-3 w-3" />
          {submitting ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function WorkspaceCommentsTab({ proposalId, authorName = "You" }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getComments(proposalId);
    setComments(data);
    setLoading(false);
  }, [proposalId]);

  useEffect(() => {
    void load();
    // Lightweight polling — 5s interval (presence channel in P9 Phase 2)
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleAdd = useCallback(
    async (body: string) => {
      const row = await addComment({ proposal_id: proposalId, author_name: authorName, body });
      if (row) setComments((prev) => [...prev, row]);
    },
    [proposalId, authorName]
  );

  const handleResolve = useCallback(async (id: string) => {
    const ok = await resolveComment(id);
    if (ok) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_resolved: true, resolved_at: new Date().toISOString() } : c
        )
      );
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteComment(id);
    if (ok) setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const visible = comments.filter((c) => !c.is_deleted);
  const unresolved = visible.filter((c) => !c.is_resolved);

  return (
    <div className="space-y-4 py-4">
      {/* Header counts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{visible.length} comment{visible.length !== 1 ? "s" : ""}</span>
        </div>
        {unresolved.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            {unresolved.length} open
          </span>
        )}
      </div>

      {/* Compose */}
      <ComposeBox onSubmit={handleAdd} />

      {/* Thread */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-[12px] text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          Loading comments…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-white/8">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="text-[13px] text-slate-400 dark:text-slate-500">
            No comments yet — start the conversation
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((c) => (
            <CommentBubble
              key={c.id}
              comment={c}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
