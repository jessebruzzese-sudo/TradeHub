import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type WelcomeTemplateInput = {
  firstName?: string;
  dashboardUrl: string;
};

export function buildWelcomeTemplate(input: WelcomeTemplateInput): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const dashboardUrl = input.dashboardUrl || 'https://tradehub.com.au/dashboard';
  const subject = 'Welcome to TradeHub';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>Your TradeHub account is now active.</p>
    <p>TradeHub helps contractors and subcontractors connect based on:</p>
    <ul>
      <li>Trade</li>
      <li>Availability</li>
      <li>Location</li>
    </ul>
    <p>Start exploring opportunities:</p>
    ${cta('Open dashboard', dashboardUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'Your TradeHub account is now active.',
    '',
    'TradeHub helps contractors and subcontractors connect based on:',
    '- Trade',
    '- Availability',
    '- Location',
    '',
    'Start exploring opportunities:',
    `Dashboard: ${dashboardUrl}`,
  ].join('\n');

  return { subject, html, text };
}

