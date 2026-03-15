import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type PremiumUpgradedTemplateInput = {
  firstName?: string;
  billingUrl: string;
};

export function buildPremiumUpgradedTemplate(
  input: PremiumUpgradedTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const billingUrl = input.billingUrl || 'https://tradehub.com.au/settings/billing';
  const subject = 'Your TradeHub Premium subscription is active';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>Your Premium subscription is now active.</p>
    <p>You now have access to:</p>
    <ul>
      <li>Instant job alerts</li>
      <li>Expanded discovery radius</li>
      <li>Priority visibility</li>
    </ul>
    <p>Manage billing:</p>
    ${cta('Open billing settings', billingUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'Your Premium subscription is now active.',
    '',
    'You now have access to:',
    '- Instant job alerts',
    '- Expanded discovery radius',
    '- Priority visibility',
    '',
    'Manage billing:',
    `Billing: ${billingUrl}`,
  ].join('\n');

  return { subject, html, text };
}

