import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type QuoteRequestTemplateInput = {
  firstName?: string;
  requesterName: string;
  requestUrl: string;
};

export function buildQuoteRequestTemplate(input: QuoteRequestTemplateInput): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const requestUrl = input.requestUrl || 'https://tradehub.com.au/messages';
  const subject = 'You received a quote request';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>${escapeHtml(input.requesterName)} has requested a quote from you.</p>
    <p>View request:</p>
    ${cta('Open messages', requestUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    `${input.requesterName} has requested a quote from you.`,
    '',
    'View request:',
    requestUrl,
  ].join('\n');

  return { subject, html, text };
}

