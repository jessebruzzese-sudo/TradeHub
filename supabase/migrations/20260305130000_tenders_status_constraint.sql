-- Enforce valid tender status values to prevent invalid states
-- (e.g. "closed", "Closed", "done", "archived") that can break logic

-- 1) Normalize any existing invalid/lowercase statuses before adding constraint
UPDATE public.tenders
SET status = upper(trim(status))
WHERE status IS NOT NULL
  AND status <> upper(trim(status));

-- Map any non-standard values to closest valid state (safety for legacy data)
UPDATE public.tenders
SET status = CASE upper(trim(status))
  WHEN 'PENDING' THEN 'PENDING_APPROVAL'
  WHEN 'DONE' THEN 'CLOSED'
  WHEN 'ARCHIVED' THEN 'CLOSED'
  ELSE 'CLOSED'
END
WHERE status IS NOT NULL
  AND upper(trim(status)) NOT IN ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'LIVE', 'CLOSED', 'CANCELLED');

-- 2) Drop if exists (idempotent)
ALTER TABLE public.tenders DROP CONSTRAINT IF EXISTS tenders_status_check;

-- 3) Add constraint: only allow known valid statuses
ALTER TABLE public.tenders
ADD CONSTRAINT tenders_status_check
CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'LIVE', 'CLOSED', 'CANCELLED'));
