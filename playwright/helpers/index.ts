/**
 * TradeHub Playwright shared helpers.
 * Use for login, signup, seed lookup, navigation, and common assertions.
 */
import { expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createChunks, stringToBase64URL } from '@supabase/ssr';
import { loadSeedIds, SEED_TITLES } from '../seed-ids';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';

function resolveFreeAccountFromEnv() {
  const allowCustom = process.env.PW_ALLOW_NON_QA_AUTH === '1';
  const envEmail = process.env.PW_EMAIL;
  const envPassword = process.env.PW_PASSWORD;
  const canonicalEmail = 'pw-free@tradehub.test';
  const canonicalPassword = 'password1';

  if (!envEmail || !envPassword) {
    return { email: canonicalEmail, password: canonicalPassword };
  }

  const isCanonicalQaFree = envEmail.toLowerCase() === canonicalEmail;
  if (allowCustom || isCanonicalQaFree) {
    return { email: envEmail, password: envPassword };
  }

  return { email: canonicalEmail, password: canonicalPassword };
}

function resolveCanonicalQaAccount(
  envEmail: string | undefined,
  envPassword: string | undefined,
  canonicalEmail: string,
  canonicalPassword: string,
): { email: string; password: string } {
  const allowCustom = process.env.PW_ALLOW_NON_QA_AUTH === '1';
  if (!envEmail || !envPassword) {
    return { email: canonicalEmail, password: canonicalPassword };
  }
  if (allowCustom || envEmail.toLowerCase() === canonicalEmail.toLowerCase()) {
    return { email: envEmail, password: envPassword };
  }
  return { email: canonicalEmail, password: canonicalPassword };
}

// Account credentials from env
const freeAccount = resolveFreeAccountFromEnv();
const premiumAccount = resolveCanonicalQaAccount(
  process.env.PW_PREMIUM_EMAIL,
  process.env.PW_PREMIUM_PASSWORD,
  'pw-premium@tradehub.test',
  'password1',
);
const unverifiedAccount = resolveCanonicalQaAccount(
  process.env.PW_NO_ABN_EMAIL,
  process.env.PW_NO_ABN_PASSWORD,
  'pw-unverified@tradehub.test',
  'password1',
);
export const ACCOUNTS = {
  free: {
    email: freeAccount.email,
    password: freeAccount.password,
  },
  premium: {
    email: premiumAccount.email,
    password: premiumAccount.password,
  },
  unverified: {
    email: unverifiedAccount.email,
    password: unverifiedAccount.password,
  },
  poster: {
    email: process.env.PW_POSTER_EMAIL || 'pw-other@tradehub.test',
    password: process.env.PW_POSTER_PASSWORD || 'password1',
  },
  admin: {
    email: process.env.PW_ADMIN_EMAIL || 'pw-admin@tradehub.test',
    password: process.env.PW_ADMIN_PASSWORD || 'password1',
  },
} as const;

function getStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL required');
  const hostname = new URL(url).hostname;
  const projectRef = hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

/** Login via Supabase and set cookies on page context. Clears existing auth cookies first. */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  const url = new URL(BASE_URL);
  const domain = url.hostname;
  await page.context().clearCookies();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed: ${error.message}`);

  const sessionJson = JSON.stringify(data.session);
  const encoded = 'base64-' + stringToBase64URL(sessionJson);
  const chunks = createChunks(getStorageKey(), encoded);
  await page.context().addCookies(
    chunks.map((c) => ({ name: c.name, value: c.value, domain, path: '/' }))
  );
}

/** Navigate to login page and fill credentials, then submit. */
export async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  // Wait for form (login page may show Loading… while auth resolves)
  const emailInput = page.locator('#email').or(page.getByLabel(/email/i).first());
  await expect(emailInput.first()).toBeVisible({ timeout: 15_000 });
  await emailInput.first().fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  // Accept any post-login route (dashboard, jobs, search, root, verify-business, etc.)
  await page.waitForURL(
    (url: string | URL) => {
      const path = typeof url === 'string' ? new URL(url).pathname : url.pathname;
      return path === '/' || /^\/(dashboard|jobs|messages|admin|onboarding|profile|subcontractors|search|verify-business)/.test(path);
    },
    { timeout: 20_000 }
  );
}

/** Logout via account menu. */
export async function logoutViaUI(page: Page): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  const accountBtn = page.getByRole('button', { name: /account menu/i });
  if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await accountBtn.click();
    await page.getByRole('menuitem', { name: /log out/i }).click({ timeout: 5000 });
    // Wait for auth to clear and protected page to redirect to login
    await page.waitForURL(/\/(login|$)/, { timeout: 15_000 }).catch(() => {});
  }
  // Brief wait for auth state to clear before next navigation
  await page.waitForTimeout(500);
}

/** Switch to a different user (logout + login). */
export async function switchToUser(page: Page, email: string, password: string): Promise<void> {
  await logoutViaUI(page);
  // Clear client-side auth and cookies so /login shows form instead of redirecting
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  await loginViaUI(page, email, password);
}

/** Wait for stable page state (network idle + short delay). */
export async function waitStable(page: Page, ms = 500): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
}

/** Load seed IDs. Returns null if seed not run. */
export function getSeedIds() {
  return loadSeedIds();
}

/** Seed titles for deterministic selectors. */
export { SEED_TITLES };

/** Check if seed data exists. */
export function hasSeedData(): boolean {
  return loadSeedIds() !== null;
}

/** Get seed job ID by key. */
export function getSeedJobId(key: 'ownedOpen' | 'nonOwnedOpen' | 'withAttachment'): string | null {
  const ids = loadSeedIds();
  return ids?.jobs?.[key] ?? null;
}

/** Get seed user ID by email. */
export function getSeedUserId(email: string): string | null {
  const ids = loadSeedIds();
  return ids?.users?.[email] ?? null;
}
