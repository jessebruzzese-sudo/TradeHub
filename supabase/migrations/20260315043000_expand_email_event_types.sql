alter table public.email_events
  drop constraint if exists email_events_type_check;

alter table public.email_events
  add constraint email_events_type_check
  check (
    email_type in (
      'account_verification',
      'welcome',
      'password_reset',
      'premium_upgraded',
      'payment_receipt',
      'payment_failed',
      'job_invite',
      'job_alert',
      'tender_alert',
      'quote_request',
      'hire_confirmed',
      'new_message',
      'abn_verified',
      'reliability_review',
      'weekly_opportunity_digest'
    )
  );
