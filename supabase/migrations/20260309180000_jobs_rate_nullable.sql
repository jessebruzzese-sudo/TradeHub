-- Make jobs.rate nullable so users can post jobs without specifying a price
ALTER TABLE public.jobs ALTER COLUMN rate DROP NOT NULL;
