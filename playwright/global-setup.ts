import fs from 'node:fs';
import path from 'node:path';
import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig) {
  const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000';

  // Load credentials from a json file if you seed them
  const credsPath = process.env.PW_CREDS_JSON || '';
  let email = process.env.PW_EMAIL || '';
  let password = process.env.PW_PASSWORD || '';

  if (credsPath && fs.existsSync(credsPath)) {
    const j = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    email = j.email;
    password = j.password;
  }

  const storageStatePath = path.join(process.cwd(), 'playwright/.auth/state.json');
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  if (!email || !password) {
    console.log('[pw] No credentials provided. Skipping global auth.');
    // Write empty state so tests run without auth
    fs.writeFileSync(storageStatePath, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);

  // Adjust selectors to your actual inputs/buttons
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for a stable post-login page
  await page.waitForURL(/dashboard|jobs|search/i, { timeout: 30_000 });
  await page.context().storageState({ path: storageStatePath });

  await browser.close();
}
