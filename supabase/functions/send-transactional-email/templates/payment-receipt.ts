import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type PaymentReceiptTemplateInput = {
  firstName?: string;
  amountLabel: string;
  dateLabel: string;
  billingUrl: string;
};

export function buildPaymentReceiptTemplate(
  input: PaymentReceiptTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'Your TradeHub Premium receipt';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>Your Premium subscription payment has been processed.</p>
    <p><strong>Amount:</strong> ${escapeHtml(input.amountLabel)}<br/>
    <strong>Date:</strong> ${escapeHtml(input.dateLabel)}</p>
    <p>Download invoice:</p>
    ${cta('Open billing', input.billingUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'Your Premium subscription payment has been processed.',
    '',
    `Amount: ${input.amountLabel}`,
    `Date: ${input.dateLabel}`,
    '',
    'Download invoice:',
    input.billingUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
