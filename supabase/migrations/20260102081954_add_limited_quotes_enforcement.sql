/*
  # Add Limited Quotes Enforcement

  ## Changes
  
  ### 1. Tenders Table
  - Add `limited_quotes_enabled` (boolean) - If true, only contractors can quote (blocks subcontractors)
  
  ## Business Rules
  
  ### Limited Quotes Feature
  - When `limited_quotes_enabled = true`:
    - Only contractors (role='contractor') can submit quotes
    - Subcontractors are blocked from submitting quotes
    - Used to protect subcontractors from lead-selling tenders
  
  - When `limited_quotes_enabled = false` (default):
    - All authenticated users with matching trade can submit quotes
    - Standard tender behavior
  
  ### Tender Posting Permissions
  - Contractors (role='contractor'): Can always post tenders
  - Subcontractors (role='subcontractor'): 
    - Can only post if they have SUBCONTRACTOR_PRO_10 or ALL_ACCESS_PRO_26 plan
    - Free subcontractors cannot post tenders
  - Admins (role='admin'): Can always post tenders
  
  ## Security
  - Enforced server-side via edge functions
  - RLS policies remain unchanged for viewing
*/

-- Add limited_quotes_enabled field to tenders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'limited_quotes_enabled'
  ) THEN
    ALTER TABLE tenders ADD COLUMN limited_quotes_enabled boolean DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN tenders.limited_quotes_enabled IS 'If true, blocks subcontractors from submitting quotes (anti-lead-selling protection)';
