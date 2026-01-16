/*
  # Add Trade-Specific Document Support

  1. Schema Changes
    - Add `trade` column to `tender_documents`
      - Nullable text field to support both general and trade-specific documents
      - General documents (trade = NULL) visible to all
      - Trade-specific documents only visible to matching trades, admins, and tender owner

  2. Security Updates
    - Update RLS policies to restrict visibility based on trade matching
    - Only show trade-specific documents to:
      - Tender owner
      - Users with matching primary_trade
      - Admin users

  3. Notes
    - Documents with NULL trade are general documents visible to all
    - Documents with a specific trade are only visible to those with that trade
    - This enables per-trade file uploads as requested in requirements
*/

-- Add trade column to tender_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tender_documents' AND column_name = 'trade'
  ) THEN
    ALTER TABLE tender_documents ADD COLUMN trade text;
  END IF;
END $$;

-- Create index for trade filtering
CREATE INDEX IF NOT EXISTS idx_tender_documents_trade ON tender_documents(trade);

-- Drop existing document visibility policies
DROP POLICY IF EXISTS "Anyone authenticated can view tender documents" ON tender_documents;
DROP POLICY IF EXISTS "Builders can manage tender documents" ON tender_documents;

-- New policy: View general documents (trade IS NULL)
CREATE POLICY "Authenticated users can view general tender documents"
  ON tender_documents FOR SELECT
  TO authenticated
  USING (
    trade IS NULL
  );

-- New policy: View trade-specific documents if user matches trade, is tender owner, or is admin
CREATE POLICY "Users can view trade-matched documents"
  ON tender_documents FOR SELECT
  TO authenticated
  USING (
    trade IS NOT NULL
    AND (
      -- User's primary_trade matches document's trade
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.primary_trade = tender_documents.trade
      )
      -- OR user is the tender owner
      OR EXISTS (
        SELECT 1 FROM tenders
        WHERE tenders.id = tender_documents.tender_id
        AND tenders.builder_id = auth.uid()
      )
      -- OR user is admin
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Policy: Tender owners can insert documents
CREATE POLICY "Tender owners can insert documents"
  ON tender_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

-- Policy: Tender owners can update their documents
CREATE POLICY "Tender owners can update documents"
  ON tender_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_id
      AND tenders.builder_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

-- Policy: Tender owners can delete their documents
CREATE POLICY "Tender owners can delete documents"
  ON tender_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_id
      AND tenders.builder_id = auth.uid()
    )
  );