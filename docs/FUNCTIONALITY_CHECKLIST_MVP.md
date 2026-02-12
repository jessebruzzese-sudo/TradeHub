# TradeHub MVP — Functionality Checklist

> Use this checklist to manually verify every key behaviour before an MVP release.
> Mark each item **Pass** or **Fail**. If Fail, note the issue in the "Notes" column.

---

## A) Auth & Onboarding

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| A1 | Navigate to `/signup`. Fill in name, email, password, and submit. | Account is created. User is redirected to onboarding or dashboard. Confirmation email sent (if enabled). | [ ] |
| A2 | Navigate to `/login`. Enter valid credentials and submit. | User is logged in and lands on `/dashboard`. | [ ] |
| A3 | On `/login`, enter an incorrect password. | Error message is shown. No crash. | [ ] |
| A4 | Click "Forgot password" and enter a valid email. | Reset email is sent. Appropriate confirmation message shown. | [ ] |
| A5 | While logged in, click Logout (from the top-bar dropdown). | User is logged out and redirected to `/login` or landing page. | [ ] |
| A6 | Try to access `/dashboard` while logged out. | Redirected to `/login`. | [ ] |

---

## B) Profile & Trade Selection

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| B1 | Navigate to `/profile`. Verify your name, email, and trade are displayed. | Profile data loads from Supabase. No hardcoded/mock data. | [ ] |
| B2 | Click Edit (or navigate to `/profile/edit`). Change your primary trade and save. | Trade is persisted to the database. Returning to `/profile` shows the updated trade. | [ ] |
| B3 | On `/profile/edit`, change your name and save. | Name updates successfully. | [ ] |
| B4 | On `/profile/edit`, verify ABN field is present (if applicable to role). | ABN entry or verification prompt is shown where required. | [ ] |

---

## C) Availability (60-day horizon; unlimited entries)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| C1 | Navigate to the availability calendar (profile or settings). | Calendar loads. Date range spans up to 60 days from today (per `MVP_AVAILABILITY_HORIZON_DAYS`). | [ ] |
| C2 | Add an availability entry for a date within the 60-day window. | Entry is saved. Calendar reflects the new entry. | [ ] |
| C3 | Add multiple availability entries across different dates. | All entries are saved. No artificial cap on the number of entries. | [ ] |
| C4 | Try to select a date beyond the 60-day horizon. | Date is not selectable, or a clear message explains the horizon limit. | [ ] |
| C5 | Remove an availability entry. | Entry is deleted. Calendar updates. | [ ] |

---

## D) Radius / Search (25 km cap)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| D1 | Open radius settings (profile or settings page). | Slider shows current radius. Max value is capped at 25 km. Label says "MVP limit". | [ ] |
| D2 | Drag the radius slider to 25 km. Save. | Value is persisted. Effective radius shows 25 km. | [ ] |
| D3 | Verify that the info banner mentions the MVP cap. | Blue alert reads: "During the MVP launch, search radius is capped at 25km for all users." | [ ] |
| D4 | Browse jobs/tenders. Confirm results are filtered within the effective radius. | Only items within ~25 km of the user's location appear. | [ ] |

---

## E) Jobs (browse, create, apply/engage; ABN gating unchanged)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| E1 | Navigate to `/jobs`. | Job listing loads from the database. No hardcoded/mock jobs. | [ ] |
| E2 | Click "Create Job" (or equivalent). Fill in details and submit. | Job is created and appears in the listing. | [ ] |
| E3 | As a different user, browse jobs and click "Apply" / "Engage" on a job. | Application/engagement is recorded. Appropriate confirmation shown. | [ ] |
| E4 | Attempt to create a job without a verified ABN. | User is prompted to verify ABN first. Job creation is gated. | [ ] |
| E5 | Attempt to apply to a job without a verified ABN. | User is prompted to verify ABN first. Application is gated. | [ ] |

---

## F) Tenders (3/month posting cap + 3/month applying cap)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| F1 | Navigate to `/tenders`. | Tender listing loads from the database. | [ ] |
| F2 | Create a tender (1st of the month). | Tender is created. Counter shows 1/3 used (or similar message). | [ ] |
| F3 | Create tender #2 and #3 in the same calendar month. | Both are created. After #3, a clear message says: "MVP limit reached (3 this month)." | [ ] |
| F4 | Attempt to create a 4th tender in the same month. | Creation is blocked with message: "MVP limit reached (3 this month). More limits will be part of Premium later." | [ ] |
| F5 | Apply/quote on a tender (1st of the month). | Quote is submitted. | [ ] |
| F6 | Apply/quote on tender #2 and #3 in the same month. | Both succeed. After #3, a message appears about the cap. | [ ] |
| F7 | Attempt to apply/quote on a 4th tender in the same month. | Blocked with message: "MVP limit reached (3 quotes this month). More limits will be part of Premium later." | [ ] |
| F8 | View a tender detail page (`/tenders/[id]`). | Tender details load. Quote status and public status labels display correctly. | [ ] |

---

## G) Messaging (threads, action cards)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| G1 | Navigate to `/messages`. | Message threads load (or empty state if none). No mock data. | [ ] |
| G2 | Open an existing thread. | Messages display in chronological order. | [ ] |
| G3 | Send a new message in a thread. | Message appears in the thread in real time (or on refresh). | [ ] |
| G4 | If action cards are present (e.g. "Accept job", "Decline"), click one. | Action is processed. Card updates to reflect completed state. | [ ] |
| G5 | Verify unread count badge on the Messages nav item. | Badge shows correct count. Resets after reading. | [ ] |

---

## H) Notifications (no mock items; empty state or real data)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| H1 | Navigate to `/notifications` with a fresh account (no activity). | Empty state is shown: "No notifications yet — You'll see updates here when someone applies, accepts a job, or sends a message." | [ ] |
| H2 | Trigger a real notification (e.g. another user applies to your job). | Notification appears with real title, description, and timestamp. | [ ] |
| H3 | Verify no hardcoded names appear (e.g. "Sam Clarke", "Jordan Smith", "Mike Chen"). | None of these mock names are present anywhere in the notifications UI or data. | [ ] |
| H4 | Click "Mark all as read". | All notifications are marked read. Blue unread dots disappear. | [ ] |

---

## I) Privacy (hide business name until engagement)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| I1 | As User A, browse the public profile of User B (no engagement between them). | User B's business name is hidden or masked. | [ ] |
| I2 | User A engages with User B (e.g. accepts a quote or starts a job). | After engagement, User B's business name becomes visible to User A. | [ ] |
| I3 | In a message thread between engaged users. | Business names are visible within the thread context. | [ ] |
| I4 | Verify `MVP_HIDE_BUSINESS_NAME_UNTIL_ENGAGEMENT` is `true` in `feature-flags.ts`. | Flag is set to `true`. | [ ] |

---

## J) Reliability / Disputes (insights + priority disputes; no highlighted badges)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| J1 | View a user's reliability section on their profile. | Reliability insights are shown (breakdown, ratings, or details). No crash. | [ ] |
| J2 | Verify `MVP_RELIABILITY_INSIGHTS_ENABLED` is `true` in `feature-flags.ts`. | Flag is `true`. | [ ] |
| J3 | Verify `MVP_PRIORITY_DISPUTES_ENABLED` is `true` in `feature-flags.ts`. | Flag is `true`. | [ ] |
| J4 | Verify `MVP_RELIABILITY_BADGES_ENABLED` is `false` in `feature-flags.ts`. | Flag is `false`. No highlighted badge is displayed on profiles. | [ ] |
| J5 | If a dispute flow exists, open a dispute. | Dispute is created. Priority handling is indicated (if applicable). | [ ] |

---

## K) Billing (disabled during MVP)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| K1 | Verify `MVP_FREE_MODE` is `true` in `feature-flags.ts`. | Flag is `true`. | [ ] |
| K2 | Check the side/bottom nav while logged in. | "Pricing" nav item is **not** visible. | [ ] |
| K3 | Navigate directly to `/pricing` while logged in. | User is redirected to `/dashboard`. | [ ] |
| K4 | `POST /api/billing/checkout` — send any valid JSON body. | Returns `403` with `{ "error": "Billing disabled during MVP launch" }`. | [ ] |
| K5 | `POST /api/billing/portal` — send any request. | Returns `403` with `{ "error": "Billing disabled during MVP launch" }`. | [ ] |
| K6 | `POST /api/billing/webhook` — send any request. | Returns `403` with `{ "error": "Billing disabled during MVP launch" }`. | [ ] |

---

## L) Admin (Users page — real errors; no avatar_url crash)

| # | Steps | Expected Result | Pass/Fail |
|---|-------|-----------------|-----------|
| L1 | Log in as an admin user. Navigate to `/admin/users`. | User list loads. Table shows real user data. | [ ] |
| L2 | Verify the Supabase query selects `avatar` (not `avatar_url`). | Code in `admin/users/page.tsx` selects: `id, name, email, role, primary_trade, trust_status, created_at, last_seen_at, avatar`. No `avatar_url`. | [ ] |
| L3 | If RLS blocks the query, verify a helpful error is shown. | Red card displays the Supabase error message plus an RLS hint: "If you only see yourself (or nothing), this is usually RLS…" | [ ] |
| L4 | Search for a user by name or email. | Filter works. Results update in real time. | [ ] |
| L5 | Change sort/filter (e.g. "Online now", trade filter). | Query re-runs. Table updates accordingly. | [ ] |
| L6 | Log in as a non-admin user and navigate to `/admin/users`. | User is redirected to `/dashboard`. Page is not accessible. | [ ] |

---

## Quick Reference: Feature Flags (src/lib/feature-flags.ts)

| Flag | MVP Value | Purpose |
|------|-----------|---------|
| `MVP_FREE_MODE` | `true` | Master billing kill-switch |
| `MVP_RADIUS_KM` | `25` | Max search radius for all users |
| `MVP_AVAILABILITY_HORIZON_DAYS` | `60` | Calendar horizon |
| `MVP_TENDERS_PER_MONTH_CAP` | `3` | Monthly tender post & apply cap |
| `MVP_ALERTS_EMAIL_ENABLED` | `true` | Email alerts active |
| `MVP_ALERTS_SMS_ENABLED` | `true` | SMS alerts active |
| `MVP_HIDE_BUSINESS_NAME_UNTIL_ENGAGEMENT` | `true` | Privacy: hide biz name pre-engagement |
| `MVP_RELIABILITY_INSIGHTS_ENABLED` | `true` | Show reliability breakdown |
| `MVP_PRIORITY_DISPUTES_ENABLED` | `true` | Priority dispute handling |
| `MVP_RELIABILITY_BADGES_ENABLED` | `false` | Highlighted badges (off at launch) |
