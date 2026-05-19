-- Wave 4 P9: Additive migration — proposal_comments table.
-- Block-anchored async commenting with @mention support.
-- Append-only timeline: rows are NEVER updated or deleted (soft-delete only).
-- Backward compatible: no existing tables are modified.

CREATE TABLE IF NOT EXISTS public.proposal_comments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to proposals (cascade delete when proposal is purged)
  proposal_id     uuid        NOT NULL
                              REFERENCES public.proposals(id) ON DELETE CASCADE,

  -- Optional block anchor — the block ID (from proposal-block-registry) that
  -- this comment is attached to. NULL = general proposal-level comment.
  block_id        text,

  -- Author — null-safe: org_user_id is null for system/anonymous events
  org_user_id     uuid,
  author_name     text        NOT NULL DEFAULT 'Anonymous',

  -- Comment body — plain text (mentions encoded as @[name](uuid))
  body            text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),

  -- Resolved state — comments can be marked resolved without deletion
  is_resolved     boolean     NOT NULL DEFAULT false,
  resolved_at     timestamptz,
  resolved_by     uuid,

  -- Soft delete — never hard-delete; UI hides deleted comments
  is_deleted      boolean     NOT NULL DEFAULT false,
  deleted_at      timestamptz,

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id
  ON public.proposal_comments (proposal_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_block_anchor
  ON public.proposal_comments (proposal_id, block_id)
  WHERE block_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposal_comments_unresolved
  ON public.proposal_comments (proposal_id, is_resolved)
  WHERE is_resolved = false AND is_deleted = false;

-- RLS: authenticated users can read/insert on their org's proposals.
-- Update only allowed for soft-delete and resolved transitions (not body edits).
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_comments" ON public.proposal_comments;
CREATE POLICY "auth_select_comments" ON public.proposal_comments
  FOR SELECT TO authenticated
  USING (true);  -- proposal_id check handled at app level; tighten per org in Phase B

DROP POLICY IF EXISTS "auth_insert_comments" ON public.proposal_comments;
CREATE POLICY "auth_insert_comments" ON public.proposal_comments
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update policy: only allow resolving / soft-deleting, not body edits.
-- Body immutability is enforced in application logic (lib/proposal-comments.ts).
DROP POLICY IF EXISTS "auth_update_comments" ON public.proposal_comments;
CREATE POLICY "auth_update_comments" ON public.proposal_comments
  FOR UPDATE TO authenticated
  USING (true);
