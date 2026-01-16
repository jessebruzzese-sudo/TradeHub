/*
  # Add Additional Trades Feature

  1. Schema Changes
    - Add `additional_trades` column to users table (text array)
    - Add `additional_trades_unlocked` column to users table (boolean)
    - Add `additional_trades_payment_date` column to users table (timestamp)
  
  2. Purpose
    - Allow users to pay $5 to add additional trades beyond their locked primary trade
    - Track when the feature was unlocked
    - Store the list of additional trades
  
  3. Matching Behavior
    - Users will match against both primary_trade AND additional_trades
    - Primary trade remains locked after account creation
*/

-- Add additional trades columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'additional_trades'
  ) THEN
    ALTER TABLE users ADD COLUMN additional_trades text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'additional_trades_unlocked'
  ) THEN
    ALTER TABLE users ADD COLUMN additional_trades_unlocked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'additional_trades_payment_date'
  ) THEN
    ALTER TABLE users ADD COLUMN additional_trades_payment_date timestamptz;
  END IF;
END $$;