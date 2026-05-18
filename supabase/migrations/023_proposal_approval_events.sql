-- Sol.52 — Phase A: Proposal OS approval event timeline.
--
-- Append-only commercial audit log for every significant event on a proposal.
-- The timeline is the single source of truth for "what happened to this proposal."
--
-- Invariant: NEVER update or delete events. Only INSERT.
-- The timeline drives future analytics, margin-leakage reporting, and audit.

CREATE TABLE IF NOT EXISTS public.proposal_approval_events (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  uuid         NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,

  -- Classifies the event for filtering and display.
  -- See lib/proposal-approval-events.ts for full payload shapes per type.
  event_type   text         NOT NULL
               CHECK (event_type IN (
                 'status_changed',
                 'snapshot_created',
                 'pricing_revised',
                 'discount_applied',
                 'project_created',
                 'approval_requested',
                 'approval_granted',
                 'approval_rejected'
               )),

  -- Structured payload. Shape varies by event_type (see TypeScript payload types).
  -- Examples:
  --   status_changed:    { from_status, to_status }
  --   snapshot_created:  { snapshot_id, version, triggered_by, final_amount_inr }
  --   pricing_revised:   { previous_final_inr, new_final_inr, delta_inr }
  --   discount_applied:  { discount_inr, discount_pct, previous_final_inr, new_final_inr }
  --   project_created:   { project_id, lead_id }
  payload      jsonb        NOT NULL DEFAULT '{}',

  -- Who triggered this event (user id, 'auto', 'system').
  -- Nullable until auth is fully wired.
  actor        text,

  occurred_at  timestamptz  NOT NULL DEFAULT now()
);

-- Fast retrieval of timeline for a proposal (oldest first = natural display order).
CREATE INDEX IF NOT EXISTS approval_events_proposal_time_idx
  ON public.proposal_approval_events (proposal_id, occurred_at ASC);

-- Index for type-filtered queries (e.g. "all discount events for proposal X").
CREATE INDEX IF NOT EXISTS approval_events_type_idx
  ON public.proposal_approval_events (proposal_id, event_type);

COMMENT ON TABLE public.proposal_approval_events IS
  'Append-only timeline of commercial and lifecycle events on a proposal. '
  'Every pricing change, status transition, discount, snapshot, and approval is recorded here. '
  'NEVER update or delete rows — only INSERT.';

COMMENT ON COLUMN public.proposal_approval_events.event_type IS
  'status_changed | snapshot_created | pricing_revised | discount_applied | '
  'project_created | approval_requested | approval_granted | approval_rejected';

COMMENT ON COLUMN public.proposal_approval_events.payload IS
  'Structured JSONB event data. Shape varies by event_type. '
  'See lib/proposal-approval-events.ts for canonical payload types per event.';

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.proposal_approval_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proposal_approval_events'
      AND policyname = 'service_role_all_events'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "service_role_all_events"
        ON public.proposal_approval_events
        AS PERMISSIVE FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

-- Anon SELECT is intentionally NOT granted on the events table.
-- The event timeline is internal; it is not exposed on the public share link.
