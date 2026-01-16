/*
  # Project Tendering System

  Complete tendering system with strict monetization, radius matching, quote caps, and subscription logic.

  ## New Tables

  ### 1. tenders
  Project tender postings from builders/developers
  - `id` (uuid, primary key) - Unique tender identifier
  - `builder_id` (uuid, foreign key) - References users table
  - `status` (text) - Tender status: DRAFT, LIVE, CLOSED, CANCELLED
  - `tier` (text) - Tier: FREE_TRIAL, BASIC_8, PREMIUM_14
  - `is_name_hidden` (boolean) - Hide builder name (show "Verified Builder")
  - `project_name` (text) - Project title
  - `project_description` (text) - Detailed description
  - `suburb` (text) - Suburb only (no exact address)
  - `postcode` (text) - Postcode
  - `lat` (numeric) - Suburb centroid latitude
  - `lng` (numeric) - Suburb centroid longitude
  - `desired_start_date` (date) - Desired project start
  - `desired_end_date` (date) - Desired project end
  - `budget_min_cents` (integer) - Minimum budget in cents
  - `budget_max_cents` (integer) - Maximum budget in cents
  - `quote_cap_total` (integer) - Max quotes allowed (3 for FREE/BASIC, null for PREMIUM)
  - `quote_count_total` (integer) - Current quote count
  - `closes_at` (timestamptz) - Tender close date
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. tender_trades
  Trades required for each tender (many-to-many)
  - `id` (uuid, primary key) - Unique identifier
  - `tender_id` (uuid, foreign key) - References tenders table
  - `trade_slug` (text) - Trade category slug (lowercase)
  - `trade_name` (text) - Trade category display name

  ### 3. tender_documents
  Documents/plans attached to tenders
  - `id` (uuid, primary key) - Unique identifier
  - `tender_id` (uuid, foreign key) - References tenders table
  - `file_name` (text) - Original file name
  - `file_url` (text) - Document URL
  - `mime_type` (text) - File MIME type
  - `size_bytes` (integer) - File size
  - `created_at` (timestamptz) - Upload timestamp

  ### 4. tender_quotes
  Quotes submitted by contractors
  - `id` (uuid, primary key) - Unique identifier
  - `tender_id` (uuid, foreign key) - References tenders table
  - `contractor_id` (uuid, foreign key) - References users table
  - `status` (text) - Quote status: SUBMITTED, WITHDRAWN, ACCEPTED, REJECTED
  - `price_cents` (integer) - Quote price in cents
  - `notes` (text) - Quote notes/details
  - `billing_mode` (text) - FREE_MONTHLY_TRIAL or SUBSCRIPTION
  - `billing_month_key` (text) - Month key "YYYY-MM"
  - `submitted_at` (timestamptz) - Quote submission timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ## User Table Additions
  
  ### Builder-specific fields
  - `builder_plan` (text) - NONE or PREMIUM_SUBSCRIPTION
  - `builder_sub_status` (text) - NONE, ACTIVE, PAST_DUE, CANCELED
  - `builder_sub_renews_at` (timestamptz) - Subscription renewal date
  - `builder_free_trial_tender_used` (boolean) - Has used free trial tender

  ### Contractor-specific fields
  - `contractor_plan` (text) - NONE, STANDARD_10, PREMIUM_20
  - `contractor_sub_status` (text) - NONE, ACTIVE, PAST_DUE, CANCELED
  - `contractor_sub_renews_at` (timestamptz) - Subscription renewal date
  - `free_quote_month_key` (text) - Current month key for free quote tracking
  - `free_quote_used_count` (integer) - Free quotes used this month (0 or 1)
  - `alerts_enabled` (boolean) - Receive tender alerts
  - `alert_channel_email` (boolean) - Email alerts enabled
  - `alert_channel_sms` (boolean) - SMS alerts enabled
  - `preferred_radius_km` (integer) - Preferred search radius
  - `base_lat` (numeric) - Base location latitude
  - `base_lng` (numeric) - Base location longitude
  - `base_suburb` (text) - Base suburb
  - `base_postcode` (text) - Base postcode

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users based on role
*/

-- Add user fields for tender system
DO $$
BEGIN
  -- Builder fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'builder_plan') THEN
    ALTER TABLE users ADD COLUMN builder_plan text DEFAULT 'NONE';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'builder_sub_status') THEN
    ALTER TABLE users ADD COLUMN builder_sub_status text DEFAULT 'NONE';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'builder_sub_renews_at') THEN
    ALTER TABLE users ADD COLUMN builder_sub_renews_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'builder_free_trial_tender_used') THEN
    ALTER TABLE users ADD COLUMN builder_free_trial_tender_used boolean DEFAULT false;
  END IF;
  
  -- Contractor fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'contractor_plan') THEN
    ALTER TABLE users ADD COLUMN contractor_plan text DEFAULT 'NONE';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'contractor_sub_status') THEN
    ALTER TABLE users ADD COLUMN contractor_sub_status text DEFAULT 'NONE';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'contractor_sub_renews_at') THEN
    ALTER TABLE users ADD COLUMN contractor_sub_renews_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'free_quote_month_key') THEN
    ALTER TABLE users ADD COLUMN free_quote_month_key text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'free_quote_used_count') THEN
    ALTER TABLE users ADD COLUMN free_quote_used_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'alerts_enabled') THEN
    ALTER TABLE users ADD COLUMN alerts_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'alert_channel_email') THEN
    ALTER TABLE users ADD COLUMN alert_channel_email boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'alert_channel_sms') THEN
    ALTER TABLE users ADD COLUMN alert_channel_sms boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferred_radius_km') THEN
    ALTER TABLE users ADD COLUMN preferred_radius_km integer DEFAULT 15;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'base_lat') THEN
    ALTER TABLE users ADD COLUMN base_lat numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'base_lng') THEN
    ALTER TABLE users ADD COLUMN base_lng numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'base_suburb') THEN
    ALTER TABLE users ADD COLUMN base_suburb text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'base_postcode') THEN
    ALTER TABLE users ADD COLUMN base_postcode text;
  END IF;
END $$;

-- Create tenders table
CREATE TABLE IF NOT EXISTS tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'DRAFT',
  tier text NOT NULL,
  is_name_hidden boolean DEFAULT false,
  project_name text NOT NULL,
  project_description text,
  suburb text NOT NULL,
  postcode text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  desired_start_date date,
  desired_end_date date,
  budget_min_cents integer,
  budget_max_cents integer,
  quote_cap_total integer,
  quote_count_total integer DEFAULT 0,
  closes_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenders_status_created ON tenders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_postcode ON tenders(postcode);
CREATE INDEX IF NOT EXISTS idx_tenders_tier ON tenders(tier);
CREATE INDEX IF NOT EXISTS idx_tenders_builder_id ON tenders(builder_id);

-- Create tender_trades table
CREATE TABLE IF NOT EXISTS tender_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  trade_slug text NOT NULL,
  trade_name text NOT NULL,
  UNIQUE(tender_id, trade_slug)
);

CREATE INDEX IF NOT EXISTS idx_tender_trades_tender_id ON tender_trades(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_trades_slug ON tender_trades(trade_slug);

-- Create tender_documents table
CREATE TABLE IF NOT EXISTS tender_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tender_documents_tender_id ON tender_documents(tender_id);

-- Create tender_quotes table
CREATE TABLE IF NOT EXISTS tender_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'SUBMITTED',
  price_cents integer NOT NULL,
  notes text,
  billing_mode text NOT NULL,
  billing_month_key text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tender_id, contractor_id)
);

CREATE INDEX IF NOT EXISTS idx_tender_quotes_contractor ON tender_quotes(contractor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tender_quotes_tender ON tender_quotes(tender_id, created_at DESC);

-- Enable RLS
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenders
CREATE POLICY "Builders can view own tenders"
  ON tenders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
      AND tenders.builder_id = auth.uid()
    )
  );

CREATE POLICY "Contractors can view live tenders"
  ON tenders FOR SELECT
  TO authenticated
  USING (
    status = 'LIVE' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
    )
  );

CREATE POLICY "Builders can create tenders"
  ON tenders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
      AND builder_id = auth.uid()
    )
  );

CREATE POLICY "Builders can update own tenders"
  ON tenders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
      AND tenders.builder_id = auth.uid()
    )
  );

-- RLS Policies for tender_trades
CREATE POLICY "Anyone authenticated can view tender trades"
  ON tender_trades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Builders can manage tender trades"
  ON tender_trades FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_trades.tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

-- RLS Policies for tender_documents
CREATE POLICY "Anyone authenticated can view tender documents"
  ON tender_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Builders can manage tender documents"
  ON tender_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_documents.tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

-- RLS Policies for tender_quotes
CREATE POLICY "Builders can view quotes on their tenders"
  ON tender_quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_quotes.tender_id
      AND tenders.builder_id = auth.uid()
    )
  );

CREATE POLICY "Contractors can view own quotes"
  ON tender_quotes FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can create quotes"
  ON tender_quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    contractor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
    )
  );

CREATE POLICY "Contractors can update own quotes"
  ON tender_quotes FOR UPDATE
  TO authenticated
  USING (contractor_id = auth.uid());
