/*
  # Add Budget Fields to Trade Requirements

  This migration adds per-trade budget fields to the tender_trade_requirements table.

  ## Changes
  
  1. Adds to tender_trade_requirements table:
     - min_budget_cents (bigint, nullable) - minimum budget for this specific trade
     - max_budget_cents (bigint, nullable) - maximum budget for this specific trade
  
  ## Notes
  - Budgets are now tracked per trade requirement rather than per tender
  - This allows builders to specify different budgets for different trades
  - Old tender-level budget fields (budget_min_cents, budget_max_cents) remain for backwards compatibility
*/

-- Add budget fields to tender_trade_requirements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tender_trade_requirements' AND column_name = 'min_budget_cents'
  ) THEN
    ALTER TABLE tender_trade_requirements ADD COLUMN min_budget_cents bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tender_trade_requirements' AND column_name = 'max_budget_cents'
  ) THEN
    ALTER TABLE tender_trade_requirements ADD COLUMN max_budget_cents bigint;
  END IF;
END $$;