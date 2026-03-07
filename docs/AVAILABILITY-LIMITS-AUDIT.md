# Availability Plan Limits — Audit Report

**Date:** 2026-03-06  
**Goal:** Verify Free users can select up to 30 days ahead, Premium users up to 90 days ahead.

---

## 1. Where the rule exists

| Location | Purpose |
|----------|---------|
| `src/lib/plan-limits.ts` | **Source of truth:** `FREE_LIMITS.availabilityDays = 30`, `PREMIUM_LIMITS.availabilityDays = 90` |
| `src/lib/subscription-utils.ts` | `getAvailabilityHorizonDays(user)` → `getLimits(getTier(user)).availabilityDays` |
| `src/components/availability-calendar.tsx` | Client UI: uses `getAvailabilityHorizonDays(user)` to filter selectable dates |
| `src/app/api/availability/route.ts` | Server: validates each date against `limits.availabilityDays` before save |

---

## 2. How the user's plan is determined

**Client (UI):** `getAvailabilityHorizonDays` in `subscription-utils.ts`:

- If `MVP_FREE_MODE === true` → returns `MVP_AVAILABILITY_HORIZON_DAYS` (60)
- Otherwise → `getLimits(getTier(user)).availabilityDays` from `plan-limits.ts`

**Server (API):** `getTier` in `plan-limits.ts`:

- Uses `isPremium(user)` which checks:
  - `is_premium === true`
  - `complimentary_premium_until` / `complimentaryPremiumUntil` (future date)
  - `premium_until` / `premiumUntil` (future date)
  - `subscription_tier === 'premium'`
  - `subscription_status === 'active'` AND `active_plan` in `['pro','premium']`
  - `subscription_status === 'active'` AND `subcontractor_plan` in `['pro','premium']`

**Fixed (2026-03-06):** `plan-limits.ts` now uses `isPremiumPlanValue()` which recognises SUBCONTRACTOR_PRO_10, ALL_ACCESS_PRO_26, PRO_10, pro, premium, and similar patterns. Client and server use the same logic.

---

## 3. Future date restriction logic

**Client (availability-calendar.tsx):**

- `maxDate = addDays(today, horizonDays)`
- Calendar `onSelect` filters: `!isAfter(d, maxDate) && !isBefore(d, today)`
- Disabled matcher: `isBefore(date, today)` for past dates

**Server (api/availability/route.ts):**

- `maxDate = addDays(today, limits.availabilityDays)`
- For each date: `if (isAfter(date, maxDate) && !isAdmin(dbUser))` → 403

**Admin bypass:** Admins are exempt from the server check (`!isAdmin(dbUser)`).

---

## 4. MVP_FREE_MODE behavior

When `MVP_FREE_MODE === true` (feature-flags.ts):

- `getAvailabilityHorizonDays` returns `MVP_AVAILABILITY_HORIZON_DAYS` (60) for everyone
- The API still uses `plan-limits.ts` (no MVP override), so server limits remain Free=30, Premium=90
- **Result:** Free users see UI allowing 60 days but server rejects dates beyond 30 days

**Current:** `MVP_FREE_MODE = false`, so plan limits apply normally.

---

## 5. API user select — missing fields

The API selects:

```ts
id, role, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status
```

**Missing:** `complimentary_premium_until`, `premium_until`, `subscription_tier`

Users with complimentary premium may be treated as Free on the server.

---

## 6. Can the limit be bypassed?

| Vector | Status |
|--------|--------|
| UI manipulation | Calendar filters dates client-side; invalid dates are dropped before save |
| Direct API call | Server validates each date; rejects with 403 if beyond horizon |
| Admin | Server bypasses the check for admins |

**Conclusion:** Non-admin users cannot bypass the server limit via API. The main risk is UI/server mismatch (plan detection, MVP mode).

---

## 7. Suggested fixes

1. **Align plan detection:** Update `plan-limits.ts` `isPremium` to treat `SUBCONTRACTOR_PRO_10`, `ALL_ACCESS_PRO_26`, `PRO_10` as premium (e.g. `plan.includes('pro')` or explicit list).
2. **API user select:** Add `complimentary_premium_until`, `premium_until`, `subscription_tier` to the user select.
3. **MVP mode:** If `MVP_FREE_MODE` is true, ensure the API either uses the same MVP horizon or documents the intentional mismatch.

---

## 8. Summary

| Item | Status |
|------|--------|
| Plan limits defined | ✅ Free=30, Premium=90 in plan-limits.ts |
| Server enforcement | ✅ API validates each date |
| Client enforcement | ✅ Calendar filters by horizon |
| Plan detection alignment | ⚠️ Possible mismatch; plan-limits may not recognize SUBCONTRACTOR_PRO_10 |
| API user fields | ⚠️ Missing complimentary_premium_until |
| Bypass risk | ❌ Not bypassable by non-admin users |
