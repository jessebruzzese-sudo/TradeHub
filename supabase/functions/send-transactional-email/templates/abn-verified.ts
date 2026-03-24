import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type AbnVerifiedTemplateInput = {
  firstName?: string;
  profileUrl: string;
};

export function buildAbnVerifiedTemplate(
  input: AbnVerifiedTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'Your business verification is complete';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>Your ABN has been verified.</p>
    <p>You now have full access to:</p>
    <ul>
      <li>Posting jobs</li>
      <li>Accepting hires</li>
      <li>Applying to jobs posted by others</li>
    </ul>
    <p>View profile:</p>
    ${cta('Open profile', input.profileUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'Your ABN has been verified.',
    '',
    'You now have full access to:',
    '- Posting jobs',
    '- Accepting hires',
    '- Applying to jobs posted by others',
    '',
    'View profile:',
    input.profileUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
