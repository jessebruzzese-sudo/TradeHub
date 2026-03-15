-- Add 'day_rate' to jobs.pay_type allowed values
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pay_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_pay_type_check
  CHECK (pay_type IN ('fixed', 'hourly', 'quote_required', 'day_rate'));
