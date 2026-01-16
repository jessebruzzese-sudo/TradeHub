/*
  # Add Tender Trade Requirements System

  1. New Tables
    - `tender_trade_requirements`
      - `id` (uuid, primary key)
      - `tender_id` (uuid, foreign key to tenders)
      - `trade` (text, the required trade)
      - `sub_description` (text, trade-specific details)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Unique constraint on (tender_id, trade) to prevent duplicate trades per tender
    - Foreign key constraint to tenders table with CASCADE delete

  3. Security
    - Enable RLS on `tender_trade_requirements` table
    - Add policy for authenticated users to read requirements
    - Add policy for tender creators to insert requirements
    - Add policy for tender creators to update their requirements
    - Add policy for tender creators to delete their requirements

  4. Notes
    - This enables tenders to support multiple required trades
    - Each trade has its own trade-specific description
    - Tender visibility will be filtered by matching user's primary_trade to required trades
*/

-- Create tender_trade_requirements table
CREATE TABLE IF NOT EXISTS tender_trade_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  trade text NOT NULL,
  sub_description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tender_id, trade)
);

-- Enable RLS
ALTER TABLE tender_trade_requirements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read tender trade requirements
CREATE POLICY "Authenticated users can read tender trade requirements"
  ON tender_trade_requirements
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Tender creators can insert trade requirements for their tenders
CREATE POLICY "Tender creators can insert trade requirements"
  ON tender_trade_requirements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

-- Policy: Tender creators can update their tender trade requirements
CREATE POLICY "Tender creators can update trade requirements"
  ON tender_trade_requirements
  FOR UPDATE
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

-- Policy: Tender creators can delete their tender trade requirements
CREATE POLICY "Tender creators can delete trade requirements"
  ON tender_trade_requirements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tender_trade_requirements_tender_id ON tender_trade_requirements(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_trade_requirements_trade ON tender_trade_requirements(trade);