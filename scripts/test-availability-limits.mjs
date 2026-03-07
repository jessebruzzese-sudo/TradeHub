#!/usr/bin/env node
/**
 * Availability plan limits — date horizon logic test
 *
 * Verifies:
 *   - Free users: max 30 days ahead
 *   - Premium users: max 90 days ahead
 *
 * Plan detection (isPremiumPlanValue, getTier) is tested in src/lib/plan-limits.test.ts
 * Run full suite: npm run test:availability-limits
 * Run date tests only: node scripts/test-availability-limits.mjs
 * Run plan detection: npm run test:plan-limits
 */

import { addDays, startOfDay, isAfter } from 'date-fns';

// Mirror plan-limits.ts constants
const FREE_AVAILABILITY_DAYS = 30;
const PREMIUM_AVAILABILITY_DAYS = 90;

/** Returns true if date is within horizon days from refDate (inclusive). */
function isDateWithinHorizon(date, horizonDays, refDate) {
  const today = startOfDay(refDate);
  const maxDate = addDays(today, horizonDays);
  return !isAfter(date, maxDate) && !isAfter(today, date);
}

const REF_DATE = new Date('2026-03-01');

const tests = [
  {
    name: 'Free: 2026-03-20 (19 days ahead)',
    date: new Date('2026-03-20'),
    horizon: FREE_AVAILABILITY_DAYS,
    expectAllowed: true,
  },
  {
    name: 'Free: 2026-04-10 (40 days ahead)',
    date: new Date('2026-04-10'),
    horizon: FREE_AVAILABILITY_DAYS,
    expectAllowed: false,
  },
  {
    name: 'Premium: 2026-05-01 (61 days ahead)',
    date: new Date('2026-05-01'),
    horizon: PREMIUM_AVAILABILITY_DAYS,
    expectAllowed: true,
  },
  {
    name: 'Premium: 2026-06-15 (106 days ahead)',
    date: new Date('2026-06-15'),
    horizon: PREMIUM_AVAILABILITY_DAYS,
    expectAllowed: false,
  },
];

let passed = 0;
let failed = 0;

console.log('\nAvailability plan limits test (ref date = 2026-03-01)\n');

for (const t of tests) {
  const allowed = isDateWithinHorizon(t.date, t.horizon, REF_DATE);
  const ok = allowed === t.expectAllowed;
  if (ok) {
    passed++;
    console.log(`  ✓ ${t.name} → ${allowed ? 'allowed' : 'blocked'} (expected)`);
  } else {
    failed++;
    console.log(`  ✗ ${t.name} → ${allowed ? 'allowed' : 'blocked'} (expected ${t.expectAllowed ? 'allowed' : 'blocked'})`);
  }
}

console.log(`\nConstants: FREE = ${FREE_AVAILABILITY_DAYS} days, PREMIUM = ${PREMIUM_AVAILABILITY_DAYS} days`);
console.log(`${passed} passed, ${failed} failed\n`);

process.exit(failed === 0 ? 0 : 1);
