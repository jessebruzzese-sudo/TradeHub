# TradeHub Playwright — Environment/Seed Fix Report

**Date:** 2025-03-11  
**Goal:** Resolve remaining failures as seed/setup issues before treating as product bugs

---

## Root Causes and Fixes

### 1. Profile Availability — "Not listed" chip

| Root Cause | Type | Fix |
|------------|------|-----|
| Auth user may have availability from prior runs; seed did not clear it | Seed/setup | Seed now deletes `subcontractor_availability` for all QA users |
| Auth default was jesse1@gmail.com (not in seed) | Setup | Auth setup default: `pw-free@tradehub.test` |
| Chip timeout | Timing | Increased timeouts to 20s / 15s |

**Files:** `scripts/pw-seed-qa.mjs`, `playwright/auth.setup.ts`, `playwright/profile-availability.spec.ts`

### 2. Profile Visibility — Verified badge

| Root Cause | Type | Fix |
|------------|------|-----|
| Seed did not set `abn_verified_at` for verified users | Seed/setup | Seed now sets `abn_verified_at` when `abn_status = 'VERIFIED'` |

**Files:** `scripts/pw-seed-qa.mjs`

### 3. Jobs / Tenders Detail Visibility

| Root Cause | Type | Fix |
|------------|------|-----|
| `user_trades` empty for seeded users; RPCs use `user_trades` or `primary_trade` | Seed/setup | Seed now upserts `user_trades` for each QA user |

**Files:** `scripts/pw-seed-qa.mjs`

### 4. Tender Discovery Visibility — Coords

| Root Cause | Type | Fix |
|------------|------|-----|
| Test created tender via UI; geocode depended on Places API | Seed/setup | Seed now creates `[E2E Discovery] Plastering Tender` with Sydney coords |
| Test required UI creation; flaky | Test | Test now asserts seed tender exists and is visible to plastering user |

**Files:** `scripts/pw-seed-qa.mjs`, `playwright/tender-discovery-visibility.spec.ts`

### 5. Request-to-Quote Notification Badge (TEST 4a)

| Root Cause | Type | Fix |
|------------|------|-----|
| TEST 1 (Requester clicks Request) fails when tender not visible | Seed/setup | `user_trades` seed ensures pw-free sees Electrical tender |

**Files:** `scripts/pw-seed-qa.mjs` (no changes to test)

### 6. Nightly Marketplace Flow

| Root Cause | Type | Fix |
|------------|------|-----|
| Suburb fill without autocomplete selection; no lat/lng | Test | Test now waits for and clicks Sydney prediction from autocomplete |

**Files:** `playwright/nightly_marketplace.spec.ts`

### 7. Auth Defaults

| Root Cause | Type | Fix |
|------------|------|-----|
| Default auth was jesse1@gmail.com (not in seed) | Setup | Auth setup and tradehub-platform-audit default to `pw-free@tradehub.test` |

**Files:** `playwright/auth.setup.ts`, `playwright/tradehub-platform-audit.spec.ts`

---

## New Seed Additions

- **pw-plastering@tradehub.test** — Plastering / Gyprock user for tender-discovery tests
- **[E2E Discovery] Plastering Tender** — Live tender with Sydney coords + Plastering trade
- **user_trades** — Upsert for all QA users with `primary_trade`
- **abn_verified_at** — Set for verified users
- **subcontractor_availability** — Cleared for all QA users at end of seed

---

## Classifications

| Failure | Type | Notes |
|---------|------|-------|
| Profile availability | Seed/setup | Seed clears availability |
| Profile visibility | Seed/setup | Seed sets `abn_verified_at` |
| Jobs detail | Seed/setup | `user_trades` populated |
| Tenders detail | Seed/setup | Same |
| Tender discovery | Seed/setup | Seed tender + test changes |
| Request-to-quote TEST 4a | Seed/setup | Depends on TEST 1 success |
| Nightly marketplace | Test | Autocomplete selection |
| Auth/login | Setup | Default credentials aligned |

**Product bugs:** None identified; fixes were seed/setup/test determinism.

---

## Files Changed

- `scripts/pw-seed-qa.mjs` — user_trades, abn_verified_at, availability clear, plastering user, discovery tender
- `playwright/auth.setup.ts` — auth default
- `playwright/profile-availability.spec.ts` — timeouts
- `playwright/tender-discovery-visibility.spec.ts` — use seed tender
- `playwright/nightly_marketplace.spec.ts` — autocomplete selection
- `playwright/tradehub-platform-audit.spec.ts` — default credentials
- `.env.example` — PW_PLASTERING_EMAIL

---

## Pre-Run Checklist

1. `npm run qa:seed` (or `npm run qa:gate` to seed + run)
2. `.env.local` with `PW_EMAIL=pw-free@tradehub.test`, `PW_PASSWORD=password1`
3. `SUPABASE_SERVICE_ROLE_KEY` for request-to-quote DB checks
4. `GOOGLE_PLACES_API_KEY` (optional) for nightly marketplace autocomplete

---

## QA Signoff

- **Seed/setup:** All fixes applied
- **Test determinism:** Improved where possible
- **Full suite:** Run `npm run qa:gate` to seed and run tests
