-- Refactor conversations from job-only to user-pair model.
-- Goal: Support one direct message thread per user pair; job_id becomes optional metadata.

-- 1. Drop FK constraint so we can alter job_id (we'll recreate with SET NULL)
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_job_id_fkey;

-- 2. Make job_id nullable
ALTER TABLE conversations
  ALTER COLUMN job_id DROP NOT NULL;

-- 3. Re-add FK with ON DELETE SET NULL (conversation survives when job is deleted)
ALTER TABLE conversations
  ADD CONSTRAINT conversations_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

-- 4. Drop old unique constraint (job_id, contractor_id, subcontractor_id)
-- PostgreSQL default name for UNIQUE(job_id, contractor_id, subcontractor_id)
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_job_id_contractor_id_subcontractor_id_key;

-- 5. Add partial unique index: one direct thread per user pair (when job_id IS NULL)
-- Uses canonical ordering so (A,B) and (B,A) map to same pair
CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_user_pair_unique
  ON conversations (LEAST(contractor_id, subcontractor_id), GREATEST(contractor_id, subcontractor_id))
  WHERE job_id IS NULL;

-- 6. Add index for user-pair lookups (both orderings)
CREATE INDEX IF NOT EXISTS idx_conversations_user_pair
  ON conversations (contractor_id, subcontractor_id);
