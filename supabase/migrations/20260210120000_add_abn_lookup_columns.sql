/*
  # ABN Lookup Integration — New Columns & Audit Table

  Supports the ABR (Australian Business Register) lookup integration
  in src/app/api/abn/verify/route.ts.

  1. users table — new columns
    - `entity_type`          (text)       — entity type from ABR (e.g. "Australian Private Company")
    - `abn_last_checked_at`  (timestamptz) — last time the ABN was verified against ABR

  2. abn_verifications table (audit trail)
    - Stores every ABR lookup result for compliance / audit purposes.
    - Keyed by user_id.  One row per verification attempt.

  NOTE: The route works without these columns/tables — it gracefully
  handles missing columns by logging a warning.  Run this migration
  to enable full audit trail and extended data storage.
*/

-- 1. Add new columns to users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE users ADD COLUMN entity_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'abn_last_checked_at'
  ) THEN
    ALTER TABLE users ADD COLUMN abn_last_checked_at timestamptz;
  END IF;
END $$;

-- 2. Create abn_verifications audit table
CREATE TABLE IF NOT EXISTS abn_verifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  entity_type   text,
  status        text        NOT NULL DEFAULT 'verified',
  provider      text        NOT NULL DEFAULT 'abr',
  checked_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_abn_verifications_user_id
  ON abn_verifications(user_id);

-- RLS: only service-role inserts (no direct user access)
ALTER TABLE abn_verifications ENABLE ROW LEVEL SECURITY;

-- Admins can read the audit trail
CREATE POLICY "Admins can view abn_verifications"
  ON abn_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
