import { cta, escapeHtml, wrapHtml, type EmailTemplateResult } from './common.ts';

export type WeeklyOpportunityDigestTemplateInput = {
  firstName?: string;
  opportunities: string[];
  jobsUrl: string;
};

export function buildWeeklyOpportunityDigestTemplate(
  input: WeeklyOpportunityDigestTemplateInput
): EmailTemplateResult {
  const name = input.firstName ? ` ${escapeHtml(input.firstName)}` : '';
  const safeOpportunities = input.opportunities.filter(Boolean).slice(0, 10);
  const listHtml =
    safeOpportunities.length > 0
      ? `<ul>${safeOpportunities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '<p>No new opportunities were matched this week.</p>';

  const subject = 'New opportunities this week';
  const html = wrapHtml(`
    <p>Hi${name},</p>
    <p>Here are new opportunities near you this week:</p>
    ${listHtml}
    <p>Explore opportunities:</p>
    ${cta('Explore opportunities', input.jobsUrl)}
  `);

  const text = [
    `Hi${input.firstName ? ` ${input.firstName}` : ''},`,
    '',
    'Here are new opportunities near you this week:',
    ...safeOpportunities.map((item) => `- ${item}`),
    '',
    'Explore opportunities:',
    input.jobsUrl,
    '',
    '— TradeHub',
  ].join('\n');

  return { subject, html, text };
}
