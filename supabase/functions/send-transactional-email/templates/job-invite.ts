import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type JobInviteTemplateInput = {
  firstName?: string;
  inviterName: string;
  jobTitle: string;
  location?: string;
  jobUrl: string;
  conversationUrl?: string;
};

export function buildJobInviteTemplate(input: JobInviteTemplateInput): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = "You've got a new opportunity on TradeHub";
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p><strong>${escapeHtml(input.inviterName)}</strong> invited you to review a new opportunity.</p>
    <p><strong>Job:</strong> ${escapeHtml(input.jobTitle)}<br/>
    ${input.location ? `<strong>Location:</strong> ${escapeHtml(input.location)}` : ''}</p>
    ${cta('Open job', input.jobUrl)}
    ${input.conversationUrl ? cta('Open conversation', input.conversationUrl) : ''}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    `${input.inviterName} invited you to a new opportunity on TradeHub.`,
    `Job: ${input.jobTitle}`,
    input.location ? `Location: ${input.location}` : '',
    '',
    `Open job: ${input.jobUrl}`,
    input.conversationUrl ? `Open conversation: ${input.conversationUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

