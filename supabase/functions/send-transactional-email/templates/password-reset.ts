import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type PasswordResetTemplateInput = {
  firstName?: string;
  resetUrl: string;
};

export function buildPasswordResetTemplate(
  input: PasswordResetTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'Reset your TradeHub password';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>Someone requested a password reset for your account.</p>
    <p>Reset password:</p>
    ${cta('Reset password', input.resetUrl)}
    <p>If this wasn’t you, you can ignore this email.</p>
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'Someone requested a password reset for your account.',
    '',
    'Reset password:',
    input.resetUrl,
    '',
    'If this wasn’t you, you can ignore this email.',
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
