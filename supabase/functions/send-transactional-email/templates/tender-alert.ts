import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type TenderAlertTemplateInput = {
  firstName?: string;
  projectName: string;
  tradeRequired: string;
  tenderUrl: string;
};

export function buildTenderAlertTemplate(
  input: TenderAlertTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'New tender opportunity available';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>A new tender opportunity is available.</p>
    <p><strong>Project:</strong> ${escapeHtml(input.projectName)}<br/>
    <strong>Trade required:</strong> ${escapeHtml(input.tradeRequired)}</p>
    <p>View tender:</p>
    ${cta('View tender', input.tenderUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'A new tender opportunity is available.',
    '',
    `Project: ${input.projectName}`,
    `Trade required: ${input.tradeRequired}`,
    '',
    'View tender:',
    input.tenderUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
