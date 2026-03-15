import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type NewMessageTemplateInput = {
  firstName?: string;
  messagesUrl: string;
};

export function buildNewMessageTemplate(input: NewMessageTemplateInput): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const subject = 'You have a new message';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>You received a new message regarding a job.</p>
    <p>Open conversation:</p>
    ${cta('Open messages', input.messagesUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'You received a new message regarding a job.',
    '',
    'Open conversation:',
    input.messagesUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
