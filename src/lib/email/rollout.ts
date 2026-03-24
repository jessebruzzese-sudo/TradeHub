import 'server-only';

import type { TransactionalEmailType } from '@/lib/email/types';

const ROLLOUT_TYPES = new Set<TransactionalEmailType>([
  'account_verification',
  'password_reset',
  'payment_receipt',
  'payment_failed',
  'job_alert',
  'new_message',
  'abn_verified',
  'reliability_review',
  'weekly_opportunity_digest',
]);

export function shouldSendEmailNow(params: {
  emailType: TransactionalEmailType;
  toEmail: string;
}): boolean {
  const broadEnabled = process.env.EMAIL_PIPELINE_BROAD_ENABLE === 'true';
  if (broadEnabled) return true;

  // Existing live templates continue sending unless broad rollout is explicitly disabled for them.
  if (!ROLLOUT_TYPES.has(params.emailType)) return true;

  const rolloutOnlyEmail = (process.env.EMAIL_PIPELINE_TEST_TO || '').trim().toLowerCase();
  if (!rolloutOnlyEmail) return true;

  return params.toEmail.trim().toLowerCase() === rolloutOnlyEmail;
}

