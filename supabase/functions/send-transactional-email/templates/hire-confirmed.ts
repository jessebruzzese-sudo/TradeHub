import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type HireConfirmedTemplateInput = {
  firstName?: string;
  projectName: string;
  startDateLabel?: string;
  detailsUrl: string;
};

export function buildHireConfirmedTemplate(
  input: HireConfirmedTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const detailsUrl = input.detailsUrl || 'https://tradehub.com.au/jobs';
  const subject = "You’ve been confirmed for a job";
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>You have been confirmed for the following job.</p>
    <p><strong>Project:</strong> ${escapeHtml(input.projectName)}<br/>
    ${input.startDateLabel ? `<strong>Start date:</strong> ${escapeHtml(input.startDateLabel)}` : ''}</p>
    <p>View details:</p>
    ${cta('Open job details', detailsUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'You have been confirmed for the following job.',
    `Project: ${input.projectName}`,
    input.startDateLabel ? `Start date: ${input.startDateLabel}` : '',
    '',
    'View details:',
    detailsUrl,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

