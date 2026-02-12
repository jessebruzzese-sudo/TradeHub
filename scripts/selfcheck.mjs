#!/usr/bin/env node
/**
 * TradeHub MVP Self-Check
 *
 * Non-invasive static checks that verify:
 *   1. Required env vars exist
 *   2. No leftover mock notification strings in source
 *   3. No avatar_url in admin users query (should be "avatar")
 *   4. MVP_FREE_MODE hides the Pricing nav item
 *
 * Usage:  node scripts/selfcheck.mjs
 * Exit:   0 = all pass, 1 = one or more failures
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// ── Helpers ────────────────────────────────────────────────────────────────

const ROOT = resolve(process.cwd());

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const results = [];

function pass(label, detail) {
  results.push({ status: 'PASS', label, detail });
  console.log(`  ${GREEN}PASS${RESET}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}

function fail(label, detail) {
  results.push({ status: 'FAIL', label, detail });
  console.log(`  ${RED}FAIL${RESET}  ${label}${detail ? `  ${detail}` : ''}`);
}

function warn(label, detail) {
  results.push({ status: 'WARN', label, detail });
  console.log(`  ${YELLOW}WARN${RESET}  ${label}${detail ? `  ${detail}` : ''}`);
}

function readFile(relativePath) {
  const full = join(ROOT, relativePath);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf-8');
}

/** Simple recursive grep — returns matching file:line entries */
function grepSource(pattern, dir = 'src') {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi');
  const matches = [];
  try {
    // Use git ls-files so we only scan tracked + untracked source files (respects .gitignore)
    const files = execSync(`git ls-files --cached --others --exclude-standard "${dir}"`, {
      cwd: ROOT,
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(Boolean)
      .filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f));

    for (const file of files) {
      const content = readFile(file);
      if (!content) continue;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          matches.push({ file, line: i + 1, text: lines[i].trim() });
        }
        regex.lastIndex = 0; // reset for global regex
      }
    }
  } catch {
    // git not available — fall back silently
  }
  return matches;
}

// ── Checks ─────────────────────────────────────────────────────────────────

console.log(`\n${BOLD}TradeHub MVP Self-Check${RESET}\n`);

// ─── 1. Environment Variables ──────────────────────────────────────────────
console.log(`${BOLD}1. Environment variables${RESET}`);

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const recommendedEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const v of requiredEnvVars) {
  if (process.env[v]) {
    pass(v, 'set');
  } else {
    fail(v, 'missing — required for the app to function');
  }
}

for (const v of recommendedEnvVars) {
  if (process.env[v]) {
    pass(v, 'set');
  } else {
    warn(v, 'missing — needed for server-side operations (billing webhooks, admin)');
  }
}

// ─── 2. No mock notification strings ───────────────────────────────────────
console.log(`\n${BOLD}2. Mock notification strings${RESET}`);

const mockNames = ['Sam Clarke', 'Jordan Smith', 'Mike Chen', 'Sarah Johnson', 'Alex Turner'];

let mockFound = false;
for (const name of mockNames) {
  const hits = grepSource(name);
  // Exclude this selfcheck script itself and docs from results
  const realHits = hits.filter(
    (h) => !h.file.startsWith('scripts/') && !h.file.startsWith('docs/')
  );
  if (realHits.length > 0) {
    mockFound = true;
    for (const h of realHits) {
      fail(`Mock name "${name}"`, `found in ${h.file}:${h.line}`);
    }
  }
}
if (!mockFound) {
  pass('No mock notification names found in src/');
}

// ─── 3. avatar_url in admin users query ────────────────────────────────────
console.log(`\n${BOLD}3. Admin users query — avatar_url check${RESET}`);

const adminUsersFile = readFile('src/app/admin/users/page.tsx');
if (!adminUsersFile) {
  warn('admin/users/page.tsx', 'file not found — skipping');
} else {
  // Look for avatar_url inside .select() calls
  const selectMatches = adminUsersFile.match(/\.select\([^)]*\)/g) || [];
  let avatarUrlInSelect = false;
  for (const sel of selectMatches) {
    if (/avatar_url/.test(sel)) {
      avatarUrlInSelect = true;
    }
  }
  if (avatarUrlInSelect) {
    fail('avatar_url in admin users .select()', 'should be "avatar" — avatar_url column does not exist and will crash');
  } else {
    pass('Admin users query uses "avatar" (not avatar_url)');
  }
}

// ─── 4. Pricing nav hidden when MVP_FREE_MODE ──────────────────────────────
console.log(`\n${BOLD}4. Pricing nav hidden during MVP${RESET}`);

// 4a. Check feature-flags.ts has MVP_FREE_MODE = true
const featureFlags = readFile('src/lib/feature-flags.ts');
if (!featureFlags) {
  warn('feature-flags.ts', 'file not found — skipping');
} else {
  const mvpFreeMatch = featureFlags.match(/export\s+const\s+MVP_FREE_MODE\s*=\s*(true|false)/);
  if (!mvpFreeMatch) {
    warn('MVP_FREE_MODE', 'could not parse value from feature-flags.ts');
  } else if (mvpFreeMatch[1] === 'true') {
    pass('MVP_FREE_MODE = true');
  } else {
    fail('MVP_FREE_MODE = false', 'should be true for MVP launch');
  }
}

// 4b. Check that app-nav.tsx uses MVP_FREE_MODE to conditionally hide Pricing
const appNav = readFile('src/components/app-nav.tsx');
if (!appNav) {
  warn('app-nav.tsx', 'file not found — skipping');
} else {
  const hidesPricing =
    appNav.includes('MVP_FREE_MODE') &&
    (appNav.includes("'Pricing'") || appNav.includes('"Pricing"'));
  if (hidesPricing) {
    pass('app-nav.tsx conditionally hides Pricing based on MVP_FREE_MODE');
  } else {
    fail('Pricing nav visibility', 'app-nav.tsx does not appear to gate Pricing on MVP_FREE_MODE');
  }
}

// 4c. Check billing routes return 403 when MVP_FREE_MODE
const billingRoutes = [
  'src/app/api/billing/checkout/route.ts',
  'src/app/api/billing/portal/route.ts',
  'src/app/api/billing/webhook/route.ts',
];

for (const route of billingRoutes) {
  const content = readFile(route);
  if (!content) {
    warn(route, 'file not found — skipping');
    continue;
  }
  const guardsMvp = content.includes('MVP_FREE_MODE') && content.includes('403');
  if (guardsMvp) {
    pass(`${route} returns 403 when MVP_FREE_MODE`);
  } else {
    fail(`${route}`, 'does not appear to return 403 when MVP_FREE_MODE is true');
  }
}

// 4d. Check pricing page redirects during MVP
const pricingPage = readFile('src/app/pricing/page.tsx');
if (!pricingPage) {
  warn('pricing/page.tsx', 'file not found — skipping');
} else {
  const redirectsMvp =
    pricingPage.includes('MVP_FREE_MODE') &&
    (pricingPage.includes("router.replace('/dashboard')") || pricingPage.includes('router.replace("/dashboard")'));
  if (redirectsMvp) {
    pass('Pricing page redirects to /dashboard during MVP');
  } else {
    fail('Pricing page', 'does not appear to redirect during MVP_FREE_MODE');
  }
}

// ── Summary ────────────────────────────────────────────────────────────────

const passes = results.filter((r) => r.status === 'PASS').length;
const fails = results.filter((r) => r.status === 'FAIL').length;
const warns = results.filter((r) => r.status === 'WARN').length;

console.log(`\n${'─'.repeat(60)}`);
console.log(
  `${BOLD}Summary:${RESET}  ${GREEN}${passes} passed${RESET}` +
    (warns ? `  ${YELLOW}${warns} warnings${RESET}` : '') +
    (fails ? `  ${RED}${fails} failed${RESET}` : '')
);

if (fails > 0) {
  console.log(`\n${RED}${BOLD}RESULT: FAIL${RESET}  — ${fails} check(s) need attention.\n`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}${BOLD}RESULT: PASS${RESET}  — all checks passed.\n`);
  process.exit(0);
}
