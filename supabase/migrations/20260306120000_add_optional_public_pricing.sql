/*
  # Add optional public pricing for subcontractor discovery/profile

  Adds columns to users table for optional pricing display:
  - pricing_type: hourly | day | from_hourly | quote_on_request
  - pricing_amount: numeric (null when quote_on_request or not set)
  - show_pricing_on_profile: boolean (default false)
  - show_pricing_in_listings: boolean (default false)

  Pricing is optional. Users can leave it blank. It only shows publicly
  when the user explicitly enables visibility.
*/

-- Add pricing columns to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pricing_type text CHECK (pricing_type IN ('hourly', 'day', 'from_hourly', 'quote_on_request')),
ADD COLUMN IF NOT EXISTS pricing_amount numeric,
ADD COLUMN IF NOT EXISTS show_pricing_on_profile boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_pricing_in_listings boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN users.pricing_type IS 'Type of rate: hourly, day, from_hourly, or quote_on_request';
COMMENT ON COLUMN users.pricing_amount IS 'Rate amount in AUD. Null for quote_on_request or when not set.';
COMMENT ON COLUMN users.show_pricing_on_profile IS 'When true, pricing is shown on public profile page.';
COMMENT ON COLUMN users.show_pricing_in_listings IS 'When true, pricing is shown in discovery/listing cards.';

-- Note: If public_profile_directory view exists, add pricing_type, pricing_amount, show_pricing_on_profile
-- to its SELECT so pricing appears on public profile pages. Own profile uses auth context.
