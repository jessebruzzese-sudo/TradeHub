import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type ReliabilityReviewTemplateInput = {
  firstName?: string;
  reviewsUrl: string;
};

export function buildReliabilityReviewTemplate(
  input: ReliabilityReviewTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'A reliability review was added to your profile';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>A reliability review has been added to your profile.</p>
    <p>You can view and respond here:</p>
    ${cta('View reviews', input.reviewsUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'A reliability review has been added to your profile.',
    '',
    'You can view and respond here:',
    input.reviewsUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
