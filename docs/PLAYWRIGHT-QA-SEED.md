# TradeHub Playwright QA Seed

Deterministic seed data for E2E tests. Run before the Playwright suite for stable, predictable coverage.

> **Release gate:** See [RELEASE-GATE.md](./RELEASE-GATE.md) for full pre-release workflow.

## Setup

1. **Env vars** (in `.env` or `.env.local`):
   - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for seed script)
   - `PW_EMAIL=pw-free@tradehub.test`
   - `PW_PASSWORD=password1`
   - `PW_PREMIUM_EMAIL=pw-premium@tradehub.test`
   - `PW_PREMIUM_PASSWORD=password1`
   - `PW_NO_ABN_EMAIL=pw-unverified@tradehub.test`
   - `PW_NO_ABN_PASSWORD=password1`

2. **Run seed**:
   ```bash
   npm run qa:seed
   ```

3. **Run tests**:
   ```bash
   npm run qa:e2e
   ```

## Seed Records (TradeHub naming)

| Type | Record | Purpose |
|------|--------|---------|
| User | pw-free@tradehub.test | Verified free (PW_EMAIL) |
| User | pw-premium@tradehub.test | Verified premium |
| User | pw-unverified@tradehub.test | Unverified, no ABN |
| User | pw-other@tradehub.test | Non-owned jobs |
| Job | [QA] Owned Open Job | Owner-permissions |
| Job | [QA] Non-Owned Open Job | Non-owner tests |
| Job | [QA] Job With Attachment | Attachment tests |

## Output

- `playwright/seed-ids.json` — IDs for direct navigation (generated, gitignored)

## Skip Messages

- **Missing seed**: `run npm run qa:seed`
- **Missing credentials**: Auth setup fails (check PW_EMAIL, PW_PASSWORD)
- **Messages action cards**: `No accepted/confirmed thread; messages use in-memory store`
