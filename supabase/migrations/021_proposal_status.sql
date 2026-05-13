-- Lightweight sales workflow on proposals (backward compatible default).

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS proposal_status text NOT NULL DEFAULT 'draft';

COMMENT ON COLUMN public.proposals.proposal_status IS 'EPC sales state: draft, sent, viewed, negotiation, approved';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_proposal_status_check'
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_proposal_status_check
      CHECK (proposal_status IN ('draft', 'sent', 'viewed', 'negotiation', 'approved'));
  END IF;
END $$;
