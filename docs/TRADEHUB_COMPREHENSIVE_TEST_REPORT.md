# TradeHub Comprehensive Test Report

Date: 2026-03-14

## Scope

- Master matrix generated: `docs/TRADEHUB_MASTER_TEST_MATRIX.csv`
- Total checklist functions tracked: `346` (exceeds 250 target)
- Source checklist: `docs/TRADEHUB_LAUNCH_CHECKLIST.md`

## Automated Runs Executed

### 1) Full CI gate

- Command: `npm run test:ci:full`
- Result: `PASS`
- Coverage includes:
  - lint
  - typecheck
  - enforcement unit tests
  - API major endpoint checks
  - platform full regression
  - supabase guardrails

### 2) Targeted deep run

- Command: `npx playwright test playwright/profile-availability.spec.ts playwright/discovery-radius.spec.ts playwright/admin.spec.ts playwright/attachments.spec.ts playwright/request-to-quote-qa.spec.ts --project=chromium`
- Result: `14 passed`, `13 skipped`, `0 failed`

### 3) Full Playwright Chromium suite

- Command: `npx playwright test --project=chromium`
- Result: `118 passed`, `47 skipped`, `0 failed`
- Total tests: `165`

## What Is Confirmed

- Auth/session core behavior (login/logout/session persistence/protected redirects)
- ABN gating core paths (verified/unverified route behavior where env allows)
- Premium gating core behavior (free restrictions + premium bypass in covered flows)
- Billing/Stripe core surfaces (checkout/portal + webhook acceptance/rejection evidence)
- Jobs/tenders core browse and several permission flows
- Notifications baseline + request-to-quote notification workflow coverage
- Route/API guardrails and unauthorized-access handling on major endpoints

## Why Tests Were Skipped

Most skipped tests were conditional and not failures:

- missing seeded entities (attachments, specific owned/non-owned records, draft states)
- missing env credentials (admin or premium/unverified paths in some specs)
- state-preconditioned workflow tests (already accepted/requested paths)

## Remaining Gaps For Full 346/346 Confirmation

- Onboarding depth (resume/defaults/first-login recovery)
- Reviews and ratings lifecycle
- Performance/resilience stress scenarios
- Cross-browser/device (Safari, Edge, mobile Safari)
- Manual-only validations (ABN real-world responses, UX polish, visual spacing)
- Seed-dependent admin and attachment assertions currently skipped

## Recommendation

- Keep current status as launch-strong for core blockers (0 failing tests in full chromium run).
- For full 346-row closure, run a seeded pass focused on skipped categories and add Safari/Edge/mobile projects.
