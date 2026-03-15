# TradeHub Playwright QA Suite

Comprehensive end-to-end tests for TradeHub platform.

## Prerequisites

1. **Seed data** (recommended for full coverage):
   ```bash
   npm run qa:seed
   ```
   Requires `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` in `.env` or `.env.local`.

2. **Environment variables**:
   - `PW_EMAIL`, `PW_PASSWORD` — Free verified user (default: pw-free@tradehub.test)
   - `PW_PREMIUM_EMAIL`, `PW_PREMIUM_PASSWORD` — Premium user
   - `PW_NO_ABN_EMAIL`, `PW_NO_ABN_PASSWORD` — Unverified user (for ABN gating tests)
   - `PW_ADMIN_EMAIL`, `PW_ADMIN_PASSWORD` — Admin user (from seed)
   - `PW_BASE_URL` — Default: http://localhost:3000

## Run Tests

```bash
# Full suite (starts dev server, runs setup, then all tests)
npm run qa:e2e

# Or
npx playwright test
```

## Run by Feature

```bash
# Authentication only
npx playwright test auth.spec.ts

# Profile and free/premium
npx playwright test profile.spec.ts free-premium-enforcement.spec.ts

# Jobs and tenders
npx playwright test jobs.spec.ts tenders.spec.ts

# Discovery and radius
npx playwright test discovery-radius.spec.ts

# Messaging and notifications
npx playwright test messaging.spec.ts notifications.spec.ts

# ABN enforcement
npx playwright test abn-enforcement.spec.ts

# Tender request-to-quote flow
npx playwright test tender-request-flow.spec.ts

# Admin smoke
npx playwright test admin.spec.ts

# Unverified user (requires PW_NO_ABN_EMAIL)
npx playwright test abn-gating-unverified.spec.ts
```

## Test Structure

| File | Coverage |
|------|----------|
| `auth.spec.ts` | Login, logout, session, protected pages |
| `profile.spec.ts` | Profile edit, free trade lock, premium upsell |
| `free-premium-enforcement.spec.ts` | Free vs premium rules |
| `jobs.spec.ts` | Jobs browse, detail, trade matching |
| `tenders.spec.ts` | Tenders browse, detail, anonymous flow |
| `discovery-radius.spec.ts` | Trade filter, radius |
| `messaging.spec.ts` | Messages page, thread creation |
| `notifications.spec.ts` | Notifications page, badge |
| `abn-enforcement.spec.ts` | Verified user ABN rules |
| `abn-gating-unverified.spec.ts` | Unverified user gating |
| `tender-request-flow.spec.ts` | Request-to-quote flow |
| `admin.spec.ts` | Admin dashboard smoke |

## Helpers

`playwright/helpers/index.ts` provides:
- `loginViaUI`, `logoutViaUI`, `switchToUser`
- `waitStable`
- `getSeedIds`, `getSeedJobId`, `getSeedTenderId`, `getSeedUserId`
- `hasSeedData`, `SEED_TITLES`
- `ACCOUNTS` (free, premium, unverified, poster, admin)

## Report

```bash
npx playwright show-report
```
