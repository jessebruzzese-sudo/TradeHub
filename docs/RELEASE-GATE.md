# TradeHub Release Gate — Playwright QA

Use this as a pre-release gate: run deterministic seed data, then the Playwright suite. All deterministic tests must pass; conditional tests may skip.

---

## Quick Start

```bash
# 1. Seed QA data (required once per env)
npm run qa:seed

# 2. Run full release gate (seed + tests)
npm run qa:gate
```

Or run tests only (if seed already exists):

```bash
npm run qa:e2e
```

---

## Required Env Vars

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for `qa:seed` |
| `PW_EMAIL` | Default: `pw-free@tradehub.test` |
| `PW_PASSWORD` | Default: `password1` |
| `PW_PREMIUM_EMAIL` | Default: `pw-premium@tradehub.test` |
| `PW_PREMIUM_PASSWORD` | Default: `password1` |
| `PW_NO_ABN_EMAIL` | For ABN gating tests: `pw-unverified@tradehub.test` |
| `PW_NO_ABN_PASSWORD` | Default: `password1` |
| `PW_BASE_URL` | Optional; defaults to `http://localhost:3000` |

---

## Test Types

### Deterministic (must pass when seed exists)

These tests use seeded data and **must pass** for a successful gate:

| Spec | Coverage |
|------|----------|
| `smoke.spec.ts` | Homepage, dashboard |
| `owner-permissions.spec.ts` | Owner vs non-owner jobs/tenders |
| `attachments.spec.ts` | Job/tender attachments |
| `profile-visibility.spec.ts` | Public profile, verified badge |
| `messaging.spec.ts` | Messages page load, empty/list state |
| `messaging-action-cards.spec.ts` | Messages page load (first test) |
| `jobs-tenders.spec.ts` | Jobs/tenders flows |
| `abn-gating.spec.ts` | ABN verification gating |
| `premium-gating.spec.ts` | Premium feature gating |
| `profile-availability.spec.ts` | Availability UI |
| `tradehub-pages.spec.ts` | Core page loads |

### Conditional (allowed to skip)

These tests **may skip** when required data is missing:

| Spec | Skip reason |
|------|-------------|
| `messaging-action-cards.spec.ts` | Accepted/confirmed thread tests — messages use in-memory store; no DB seed |
| `attachments.spec.ts` | Skips when no job/tender with attachments |
| `profile-visibility.spec.ts` | Skips when `seed-ids.json` missing |

---

## Interpreting Results

| Result | Meaning |
|--------|---------|
| **Pass** | Test passed |
| **Skip** | Expected when seed or required data is missing; not a failure |
| **Fail** | Real failure — investigate before release |

### Common skip messages

- `Missing seed: run npm run qa:seed` — Run the seed script
- `Missing seed: accepted/confirmed thread (messages use in-memory store)` — Messaging action-card tests; no DB seed for conversations
- `Missing credentials` — Auth setup failed; check `PW_EMAIL`, `PW_PASSWORD`

### Failures to fix

- Auth setup fails → Check env vars and Supabase connectivity
- Deterministic test fails → Fix the bug or update the test
- Flaky failures → Check selectors and timing

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `qa:seed` | Create deterministic QA records (users, jobs, tenders) |
| `qa:e2e` | Run all Playwright tests |
| `qa:gate` | Seed + run tests (full release gate) |
| `qa:report` | Open last Playwright HTML report |

---

## Seed Records (TradeHub naming)

| Type | Record | Purpose |
|------|--------|---------|
| User | pw-free@tradehub.test | Verified free (PW_EMAIL) |
| User | pw-premium@tradehub.test | Verified premium |
| User | pw-unverified@tradehub.test | Unverified, no ABN |
| User | pw-other@tradehub.test | Non-owned jobs/tenders |
| Job | [QA] Owned Open Job | Owner-permissions |
| Job | [QA] Non-Owned Open Job | Non-owner tests |
| Job | [QA] Job With Attachment | Attachment tests |
| Tender | [QA] Owned Draft Tender | Owner draft |
| Tender | [QA] Owned Live Tender | Owner live + document |
| Tender | [QA] Non-Owned Tender | Non-owner tests |

---

## CI Usage

```yaml
# Example: run release gate before deploy
- run: npm run qa:seed
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
- run: npm run qa:e2e
  env:
    PW_EMAIL: pw-free@tradehub.test
    PW_PASSWORD: password1
    # ... other PW_* vars
```
