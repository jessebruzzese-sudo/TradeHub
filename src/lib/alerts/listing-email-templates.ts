/**
 * Email templates for job listing alerts.
 */

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'https://tradehub.com.au'
  ).replace(/\/$/, '');
}

export function buildJobAlertEmail(params: {
  title: string;
  trade: string;
  location?: string | null;
  descriptionSnippet?: string;
  listingUrl: string;
}): { subject: string; html: string } {
  const subject = `New ${params.trade} job posted on TradeHub`;
  const locationLine = params.location ? `<p><strong>Location:</strong> ${escapeHtml(params.location)}</p>` : '';
  const descLine = params.descriptionSnippet
    ? `<p>${escapeHtml(params.descriptionSnippet)}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="margin-top:0;color:#1e40af;">New job matching your trade</h2>
  <p><strong>${escapeHtml(params.title)}</strong></p>
  <p><strong>Trade:</strong> ${escapeHtml(params.trade)}</p>
  ${locationLine}
  ${descLine}
  <p style="margin-top:24px;">
    <a href="${escapeHtml(params.listingUrl)}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;">View job</a>
  </p>
  <p style="margin-top:32px;font-size:12px;color:#6b7280;">You received this because you have email alerts enabled for ${escapeHtml(params.trade)} jobs on TradeHub.</p>
</body>
</html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function jobListingUrl(jobId: string): string {
  return `${getBaseUrl()}/jobs/${jobId}`;
}
