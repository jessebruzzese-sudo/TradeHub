import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type PaymentFailedTemplateInput = {
  firstName?: string;
  billingUrl: string;
};

export function buildPaymentFailedTemplate(
  input: PaymentFailedTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'Payment failed — action required';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>We couldn't process your Premium subscription payment.</p>
    <p>Please update your payment method.</p>
    <p>Update billing:</p>
    ${cta('Update billing', input.billingUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    "We couldn't process your Premium subscription payment.",
    '',
    'Please update your payment method.',
    '',
    'Update billing:',
    input.billingUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
