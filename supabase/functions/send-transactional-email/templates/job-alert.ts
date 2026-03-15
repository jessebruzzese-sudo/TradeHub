import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type JobAlertTemplateInput = {
  firstName?: string;
  trade: string;
  location: string;
  jobUrl: string;
};

export function buildJobAlertTemplate(input: JobAlertTemplateInput): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = `New ${input.trade} job near you`;
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>A new job has been posted matching your trade.</p>
    <p><strong>Trade:</strong> ${escapeHtml(input.trade)}<br/>
    <strong>Location:</strong> ${escapeHtml(input.location)}</p>
    <p>View job:</p>
    ${cta('View job', input.jobUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'A new job has been posted matching your trade.',
    '',
    `Trade: ${input.trade}`,
    `Location: ${input.location}`,
    '',
    'View job:',
    input.jobUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
