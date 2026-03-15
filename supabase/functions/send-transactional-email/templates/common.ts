export type EmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function wrapHtml(content: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TradeHub</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1d4ed8;color:#fff;padding:16px 20px;font-size:20px;font-weight:700;">TradeHub</td>
            </tr>
            <tr>
              <td style="padding:22px 20px;line-height:1.5;font-size:15px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px 20px;color:#64748b;font-size:12px;">
                Transactional message from TradeHub
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function cta(label: string, href: string): string {
  return `<p style="margin:16px 0;">
  <a href="${escapeHtml(href)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
    ${escapeHtml(label)}
  </a>
</p>`;
}

