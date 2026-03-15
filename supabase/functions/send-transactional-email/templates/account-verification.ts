import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type AccountVerificationTemplateInput = {
  firstName?: string;
  verifyUrl: string;
};

export function buildAccountVerificationTemplate(
  input: AccountVerificationTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'Verify your TradeHub account';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>Welcome to TradeHub.</p>
    <p>Please confirm your email address to activate your account.</p>
    <p>Verify account:</p>
    ${cta('Verify account', input.verifyUrl)}
    <p>This link expires in 24 hours.</p>
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'Welcome to TradeHub.',
    '',
    'Please confirm your email address to activate your account.',
    '',
    'Verify account:',
    input.verifyUrl,
    '',
    'This link expires in 24 hours.',
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
