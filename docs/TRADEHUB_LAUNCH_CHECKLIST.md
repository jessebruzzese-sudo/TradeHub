# TradeHub Launch Verification Checklist

Use this sheet to verify launch readiness with consistent evidence.

## Status Key

- `CONFIRMED`: verified via passing automated test or manual check with evidence
- `NOT CONFIRMED`: not yet verified in this launch cycle
- `BLOCKED`: could not verify due to environment/data dependency

## Tracking Columns

| Feature | Function | Expected behavior | Free user | Premium user | Unverified user | Admin | Automated | Manual | Pass/Fail | Notes |
|---|---|---|---|---|---|---|---|---|---|---|

> Fill one row per function below. Default all rows to `NOT CONFIRMED` until proven.

---

## 1) Authentication and Session

- [ ] Sign up
- [ ] Login
- [ ] Logout
- [ ] Session persists on refresh
- [ ] Protected routes redirect correctly when logged out
- [ ] Logged-in users redirected away from auth pages where appropriate
- [ ] Password reset flow
- [ ] Email confirmation behavior (if enabled)
- [ ] Duplicate account handling
- [ ] Invalid credentials handling
- [ ] Expired session handling
- [ ] Multi-tab auth state consistency

## 2) User Onboarding

- [ ] Role/account type selection
- [ ] Primary trade selection
- [ ] Multi-trade selection logic
- [ ] Premium gating for multiple trades
- [ ] Business/profile creation on first login
- [ ] Missing profile row recovery
- [ ] Default values assigned correctly
- [ ] Onboarding resume if user leaves mid-flow

## 3) Account/Profile Management

- [ ] Edit profile
- [ ] Save profile changes
- [ ] Business name update
- [ ] Bio/about update
- [ ] Trade selection update
- [ ] Service area update
- [ ] Contact details update
- [ ] Avatar/logo upload
- [ ] Portfolio upload
- [ ] Portfolio delete
- [ ] Public/private profile toggle
- [ ] Verified badge display rules
- [ ] Rating display rules
- [ ] Profile completeness logic

## 4) ABN Verification

- [ ] ABN entry
- [ ] ABN format validation
- [ ] ABN verification request
- [ ] Verified ABN saved to profile
- [ ] Business name persistence from ABN check
- [ ] Show/hide ABN toggle
- [ ] Show/hide business name toggle
- [ ] ABN status badges
- [ ] ABN-required actions blocked correctly
- [ ] Non-ABN users can still browse where intended
- [ ] Verified users regain access immediately after verification

## 5) Premium/Billing/Subscription

- [ ] Upgrade to Premium
- [ ] Checkout opens correctly
- [ ] Successful Stripe checkout updates plan
- [ ] Failed checkout leaves plan unchanged
- [ ] Cancel subscription
- [ ] Billing portal access
- [ ] Webhook updates subscription state
- [ ] Premium expiry/downgrade handling
- [ ] Complimentary premium logic
- [ ] Free vs Premium UI differences
- [ ] Plan badges
- [ ] Trial logic (if any)
- [ ] Duplicate webhook/event idempotency
- [ ] Incorrect webhook signature rejection

## 6) Premium Feature Enforcement

- [ ] Multi-trade selection gated correctly
- [ ] Expanded radius gated correctly
- [ ] Extra locations gated correctly
- [ ] Search-from-location gated correctly
- [ ] Longer availability horizon gated correctly
- [ ] Premium-only discovery filters gated
- [ ] Premium CTA appears when blocked
- [ ] Premium modal copy/actions correct
- [ ] Direct URL/API cannot bypass premium restrictions

## 7) Location and Radius Logic

- [ ] Base location save
- [ ] Google Places/autocomplete selection
- [ ] Lat/lng persistence
- [ ] Postcode persistence
- [ ] Manual suburb entry fallback
- [ ] Search radius save
- [ ] Preferred work radius save
- [ ] Contractor alert radius save
- [ ] Search-from location save
- [ ] Multiple saved locations for premium users
- [ ] Remove saved location
- [ ] Radius matching logic
- [ ] Distance filtering logic
- [ ] Non-premium fallback to base location only

## 8) Availability System

- [ ] Open availability page
- [ ] Select single dates
- [ ] Select multiple dates
- [ ] Save availability
- [ ] Update availability
- [ ] Delete availability
- [ ] Past date restriction
- [ ] Free plan date-range limit
- [ ] Premium plan date-range limit
- [ ] Availability chip on profile/dashboard
- [ ] "List availability" vs "Update availability" CTA logic
- [ ] No-availability state
- [ ] Past-only availability state
- [ ] Next available date display
- [ ] Availability visibility rules

## 9) Search/Discovery

- [ ] Search users by trade
- [ ] Search users by location
- [ ] Search users by radius
- [ ] Search users by name/business
- [ ] Search users by availability
- [ ] Search users by verification state
- [ ] Search users by premium state (if exposed)
- [ ] Search pagination/infinite scroll
- [ ] Empty state
- [ ] No-results state
- [ ] Filter reset
- [ ] Sorting behavior
- [ ] Search performance with real data
- [ ] Public/private profile visibility respected in search
- [ ] Trade restrictions for free users respected in search
- [ ] Premium radius rules respected in search

## 10) Public Profiles

- [ ] Own public profile
- [ ] Other user profile
- [ ] Verified badge visibility
- [ ] Rating visibility
- [ ] Portfolio visibility
- [ ] Availability visibility
- [ ] Contact/message buttons
- [ ] Hidden fields stay hidden
- [ ] Private profile inaccessible/limited correctly
- [ ] Non-self profile does not show self-management controls

## 11) Messaging / Conversations

- [ ] Start direct message from profile
- [ ] Start direct message from search/discover
- [ ] Reuse existing direct thread
- [ ] Start job-based conversation
- [ ] Job actions route into correct thread
- [ ] Send text message
- [ ] Receive/render message
- [ ] Message ordering
- [ ] Conversation list loads
- [ ] Unread badges
- [ ] Read state updates
- [ ] Empty state on desktop/mobile
- [ ] Mobile inbox/thread navigation
- [ ] Attachment support (if enabled)
- [ ] Message permissions
- [ ] Deleted/closed job thread handling
- [ ] Duplicate thread prevention
- [ ] Direct user-pair conversation uniqueness

## 12) Messaging Action Cards / Workflow Actions

- [ ] Accept action card
- [ ] Decline action card
- [ ] Confirm hire action card
- [ ] Quote request actions
- [ ] Disabled state when preconditions not met
- [ ] UI updates after success
- [ ] Action cannot be repeated incorrectly
- [ ] Only correct users can perform action
- [ ] Closed/cancelled job disables actions
- [ ] Notifications reflect action results

## 13) Jobs

- [ ] View jobs list
- [ ] Find Work / My Job Posts tabs
- [ ] Create job
- [ ] Draft behavior (if any)
- [ ] Publish job
- [ ] Edit job
- [ ] Close job
- [ ] Reopen job (if supported)
- [ ] Delete job
- [ ] Only owner can edit/close/delete
- [ ] Job detail page rendering
- [ ] Trade filters
- [ ] Distance filters
- [ ] Attachments upload
- [ ] Signed URL attachment render
- [ ] PDF attachment render
- [ ] Image lightbox render
- [ ] Owner controls visibility
- [ ] Non-owner cannot access restricted controls
- [ ] ABN gating on create/apply/contractual actions
- [ ] Premium enforcement on job visibility/matching (where applicable)

## 14) Job Applications / Hiring Flow

- [ ] Apply to job
- [ ] Withdraw application
- [ ] View applicants
- [ ] Contractor can shortlist/select
- [ ] Final confirm hire action
- [ ] Applicant status updates
- [ ] Duplicate application prevention
- [ ] Correct application visibility boundaries
- [ ] Unverified users blocked where intended
- [ ] Messaging integration with application flow

## 15) Tenders

- [ ] View tenders list
- [ ] Create tender
- [ ] Publish tender
- [ ] Edit tender
- [ ] Cancel tender
- [ ] Delete tender
- [ ] Hard delete behavior matches intended rule
- [ ] Tender detail page
- [ ] Tender trade requirements
- [ ] Request to quote
- [ ] Accept quote request
- [ ] Decline quote request
- [ ] Tender messaging
- [ ] Tender owner permissions
- [ ] Admin delete tender
- [ ] ABN enforcement in tender actions
- [ ] No TradeGate remnants in tender flow
- [ ] Free/Premium tender limits enforced

## 16) Reviews and Ratings

- [ ] Leave standard review
- [ ] Review allowed only after valid interaction
- [ ] One review per valid event where intended
- [ ] Edit/delete review (if supported)
- [ ] Review displays on profile
- [ ] Reliability review for late cancellation
- [ ] Reliability review guardrails
- [ ] Reduced weighting vs normal reviews
- [ ] One-response right
- [ ] Emergency tagging
- [ ] Per-day rule for multi-day jobs
- [ ] Average rating calculation
- [ ] Empty rating state
- [ ] Fraud/duplicate prevention

## 17) Notifications

- [ ] In-app notifications appear
- [ ] Correct recipient receives notification
- [ ] Read/unread state
- [ ] Notification deep-link destination correctness
- [ ] Quote/job/message notifications
- [ ] Accepted/declined action notifications
- [ ] No duplicate notifications
- [ ] Old notifications render correctly
- [ ] Pagination/load-more (if applicable)

## 18) Admin Functionality

- [ ] Admin login/access
- [ ] Non-admin blocked from admin routes
- [ ] Admin dashboard stats
- [ ] Admin users list
- [ ] Admin user detail page
- [ ] Admin jobs list/detail
- [ ] Admin tenders list/detail
- [ ] Admin reviews list/detail
- [ ] Admin reliability reviews list/detail
- [ ] Admin can delete tenders
- [ ] Admin moderation actions
- [ ] Admin audit log visibility
- [ ] Admin billing/subscription view
- [ ] Admin actions do not break user-facing data
- [ ] Admin APIs require service role or secure server path only

## 19) Route Guards and Permissions

- [ ] Unauthenticated user redirects
- [ ] Authenticated access works
- [ ] ABN-gated routes redirect correctly
- [ ] Premium-gated routes redirect/modal correctly
- [ ] Admin-only routes protected
- [ ] Private profile/data not exposed by direct URL
- [ ] Server actions/API enforce same permissions as UI
- [ ] RLS-backed data access behaves correctly

## 20) Supabase / Data Integrity / Guardrails

- [ ] Profile row exists after signup
- [ ] `ensureProfileRow` behavior
- [ ] Missing row auto-recovery
- [ ] Required tables/views queried correctly
- [ ] No invalid-column queries
- [ ] RLS blocks unauthorized reads
- [ ] RLS blocks unauthorized writes
- [ ] Signed URLs generated correctly
- [ ] Soft vs hard delete behavior matches spec
- [ ] Data consistency after key actions
- [ ] Duplicate row prevention
- [ ] Cascade delete behavior

## 21) File Uploads / Storage

- [ ] Avatar upload
- [ ] Portfolio image upload
- [ ] Portfolio PDF upload
- [ ] Job attachment upload
- [ ] Tender attachment upload (if supported)
- [ ] File preview
- [ ] File delete
- [ ] Invalid file type rejection
- [ ] Oversized file rejection
- [ ] Signed URL access
- [ ] Deleted files inaccessible
- [ ] Cross-user file access blocked

## 22) UI/UX Behavior

- [ ] Loading states
- [ ] Empty states
- [ ] Error toasts/messages
- [ ] Success states
- [ ] Disabled button states
- [ ] Form validation messages
- [ ] Mobile responsiveness
- [ ] Tablet responsiveness
- [ ] Desktop responsiveness
- [ ] Sticky headers/composers
- [ ] Modal open/close behavior
- [ ] Keyboard accessibility
- [ ] Tab order
- [ ] Focus management
- [ ] Visual regression on key pages

## 23) Performance / Resilience

- [ ] Large list rendering
- [ ] Slow network handling
- [ ] Retry behavior on transient failures
- [ ] Double-click/double-submit prevention
- [ ] Refresh during in-flight actions
- [ ] Browser back/forward behavior
- [ ] Graceful recovery from 400/401/403/500
- [ ] No white-screen on bad data
- [ ] Long-running pages do not leak state

## 24) SEO / Marketing Pages

- [ ] Homepage loads
- [ ] Pricing page loads
- [ ] CTA links are correct
- [ ] Meta titles/descriptions
- [ ] Open Graph preview
- [ ] Canonical tags (if used)
- [ ] Public pages accessible without auth
- [ ] Mobile hero behavior
- [ ] Pricing plan display accuracy
- [ ] No outdated copy about old pricing/plans

## 25) Security / Abuse Prevention

- [ ] Unauthorized API calls blocked
- [ ] Hidden UI routes do not bypass permissions
- [ ] Cross-account access attempts fail
- [ ] Admin endpoints protected
- [ ] Stripe webhook signature required
- [ ] Sensitive data not exposed in client payloads
- [ ] Private files not publicly enumerable
- [ ] Rate limiting/abuse handling (if implemented)
- [ ] Input sanitization/basic XSS checks

## 26) Cross-Browser / Device Coverage

- [ ] Chrome
- [ ] Safari
- [ ] Edge
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Common viewport sizes
- [ ] Touch interactions on mobile
- [ ] File uploads on mobile
- [ ] Date picker behavior across browsers

## 27) Release-Critical End-to-End Journeys

- [ ] New user signs up and completes onboarding
- [ ] User verifies ABN
- [ ] User upgrades to Premium
- [ ] Premium features unlock immediately
- [ ] User creates availability
- [ ] User searches and finds another trade business
- [ ] User opens profile and sends a message
- [ ] Contractor posts a job
- [ ] Subcontractor applies/accepts relevant workflow
- [ ] Contractor confirms hire
- [ ] User creates a tender
- [ ] Another user requests/accepts quote flow
- [ ] User logs out and protected routes are blocked
- [ ] Admin can moderate a key record

## 28) Manual-only or Semi-manual Checks

- [ ] Stripe real checkout in test mode
- [ ] Stripe webhook delivery
- [ ] ABN verification real-world response
- [ ] Google Places/autocomplete correctness
- [ ] Signed URL attachment previews
- [ ] Mobile UX polish
- [ ] Visual spacing/layout
- [ ] Performance under real seeded data
- [ ] Error copy clarity
- [ ] End-to-end business-rule sense (not just technical pass)

---

## Launch Blockers (Must Be `CONFIRMED`)

- [ ] Login/logout/session correctness
- [ ] ABN enforcement
- [ ] Premium enforcement
- [ ] Stripe checkout + webhook sync
- [ ] Jobs create/apply/owner controls
- [ ] Tenders create/request/accept/delete
- [ ] Messaging start/send/reuse-thread logic
- [ ] Availability save/render logic
- [ ] Search/location/radius correctness
- [ ] Admin permissions
- [ ] RLS / unauthorized access protection

---

## Current Evidence Snapshot

Current evidence was taken from local terminal artifacts plus a fresh full gate run:

- `CONFIRMED`: `npm run test:ci:full` passed end-to-end (lint, typecheck, enforcement unit tests, API major endpoints, platform full regression, and supabase guardrails)
- `CONFIRMED`: Stripe webhook signature rejection path observed (400 responses with signature verification failures in local run logs)
- `CONFIRMED`: Stripe webhook accepted path observed (200 responses for forwarded events in local Stripe listener logs)
- `CONFIRMED`: Broad launch-blocker areas exercised by `platform-full-regression.spec.ts` and `supabase-guardrails.spec.ts` (auth, ABN, premium, jobs/tenders, messaging, profile, admin, billing, permission guardrails)
- `NOT CONFIRMED`: every individual function in this sheet remains per-row unconfirmed until explicitly mapped to a passing test case and/or manual evidence

---

## Auto-fill: Playwright Coverage Mapping

This auto-fill is based on current spec set plus the latest passing run of `npm run test:ci:full`.

### Status Labels

- `CONFIRMED`: covered by tests that passed in this cycle
- `COVERED-NOT-RUN`: automated test exists, but not part of this cycle's confirmed run
- `MANUAL-GAP`: no reliable automated evidence yet

### Launch Blockers (Row-Level Status)

| Launch blocker function | Status | Evidence | Gap to close |
|---|---|---|---|
| Login/logout/session correctness | `CONFIRMED` | `auth.spec.ts`, `platform-full-regression.spec.ts`, `supabase-guardrails.spec.ts` (passed) | Add multi-tab auth check for stronger confidence |
| ABN enforcement | `CONFIRMED` | `platform-full-regression.spec.ts`, `supabase-guardrails.spec.ts` (passed) | Add explicit ABN verify success transition assertion |
| Premium enforcement | `CONFIRMED` | `platform-full-regression.spec.ts`, `supabase-guardrails.spec.ts` (passed) | Add API bypass tests per premium-only endpoint |
| Stripe checkout + webhook sync | `CONFIRMED` | `stripe-smoke` surfaces and live webhook 200/400 evidence; billing endpoints exercised in passed suites | Add idempotency and duplicate-event assertions |
| Jobs create/apply/owner controls | `CONFIRMED` (partial) | job routes and controls exercised in `platform-full-regression.spec.ts` (passed) | Add deterministic create+apply full workflow assertion |
| Tenders create/request/accept/delete | `CONFIRMED` (partial) | tender routes and request flow exercised in passed suites; `request-to-quote-qa.spec.ts` also passed key request/accept/notification checks in current run | Add deterministic delete/hard-delete assertions |
| Messaging start/send/reuse-thread logic | `CONFIRMED` (partial) | `platform-full-regression.spec.ts` + `messaging.spec.ts` coverage | Add deterministic send+receive+ordering assertion in one test |
| Availability save/render logic | `CONFIRMED` (partial) | `profile-availability.spec.ts` passed in current run (core save/render/navigation paths) | Add date-limit and past-date restriction assertions |
| Search/location/radius correctness | `CONFIRMED` (partial) | `discovery-radius.spec.ts` passed in current run | Add strict geo-distance boundary assertions and multi-location premium path |
| Admin permissions | `CONFIRMED` (partial) | Guardrails passed; targeted `admin.spec.ts` run attempted but skipped due missing admin env/seed | Execute admin specs with seeded admin credentials |
| RLS / unauthorized access protection | `CONFIRMED` | `api-major-endpoints.spec.ts` + `supabase-guardrails.spec.ts` (passed) | Add explicit cross-account read/write negative cases |

### Section-Level Auto-fill and Exact Gaps

| Section | Auto-fill status | Confirmed/Covered now | Exact gaps requiring manual or new tests |
|---|---|---|---|
| 1. Authentication and session | `CONFIRMED` (partial) | Login/logout/invalid credentials/session persistence/protected redirects | Sign-up submit, password reset, email confirmation, duplicate account, expired session, multi-tab consistency |
| 2. User onboarding | `MANUAL-GAP` | Basic auth entry points only | Entire onboarding flow rows not reliably automated |
| 3. Account/profile management | `COVERED-NOT-RUN` | Profile page/edit access and visibility specs exist | Field-level save assertions (business name, bio, contact, portfolio CRUD) |
| 4. ABN verification | `CONFIRMED` (partial) | ABN-gated route behavior and verified/unverified surfaces | ABN entry/format/verification request lifecycle and persistence rows |
| 5. Premium/billing/subscription | `CONFIRMED` (partial) | Checkout/portal endpoint and webhook path evidence | Cancel flow, downgrade/expiry, complimentary/trial, idempotency rows |
| 6. Premium feature enforcement | `CONFIRMED` (partial) | Trade restriction and premium bypass checks | Direct URL/API bypass rows for every premium-only feature |
| 7. Location and radius logic | `CONFIRMED` (partial) | `discovery-radius.spec.ts` passed in current run | Places autocomplete, lat/lng persistence, location CRUD, precise distance matching |
| 8. Availability system | `CONFIRMED` (partial) | `profile-availability.spec.ts` passed in current run | Past-date restriction, free/premium range limits, next-date render validation |
| 9. Search/discovery | `COVERED-NOT-RUN` | Trade/radius discovery and visibility specs exist | Name/business search, pagination, sorting, filter reset, perf rows |
| 10. Public profiles | `COVERED-NOT-RUN` | Public profile load, verified badge, availability CTA | Hidden field rules, private profile access boundaries, self-control isolation |
| 11. Messaging/conversations | `CONFIRMED` (partial) | Messages page and userId thread-open path | Deterministic send/receive/order/unread/read-state coverage |
| 12. Messaging action cards | `COVERED-NOT-RUN` | Action-card specs exist (conditional) | Full accept/decline/confirm outcomes and repeat-prevention deterministically |
| 13. Jobs | `CONFIRMED` (partial) | Jobs list/detail/tabs and some owner controls | Full create/edit/close/reopen/delete/apply lifecycle with deterministic assertions |
| 14. Job applications/hiring flow | `MANUAL-GAP` | Partial action-card and job CTA evidence only | End-to-end apply/withdraw/shortlist/confirm status transitions |
| 15. Tenders | `CONFIRMED` (partial) | Tender list/detail/request flow and some owner controls | Edit/cancel/delete/hard-delete and full permission matrix |
| 16. Reviews and ratings | `MANUAL-GAP` | No strong automated coverage detected | Entire section |
| 17. Notifications | `CONFIRMED` (partial) | Request-to-quote notification assertions passed in current run | Destination deep-link assertions, duplicate suppression, pagination |
| 18. Admin functionality | `CONFIRMED` (partial) | Admin guardrails passed; `admin.spec.ts` skipped (credentials/seed gating) | Detailed admin entities/actions/audit/billing views by route with admin seed |
| 19. Route guards and permissions | `CONFIRMED` (partial) | Auth and API guardrails tested and passed | Full UI/API parity checks for every gated action |
| 20. Supabase/data integrity/guardrails | `CONFIRMED` (partial) | Supabase guardrails + API endpoint status checks passed | Schema-level integrity rows (duplicate/cascade/soft-vs-hard) |
| 21. File uploads/storage | `COVERED-NOT-RUN` | `attachments.spec.ts` executed but skipped due missing attachment seed rows | Upload rejection rules, signed URL expiry behavior, cross-user access checks |
 
### Latest Targeted Run Result
 
- Command: `npx playwright test playwright/profile-availability.spec.ts playwright/discovery-radius.spec.ts playwright/admin.spec.ts playwright/attachments.spec.ts playwright/request-to-quote-qa.spec.ts --project=chromium`
- Outcome: `14 passed`, `13 skipped`, `0 failed`
- Primary skip reasons: missing admin seeded credentials, missing attachment seed fixtures, and conditional request-state preconditions in QA flow

### Latest Full Chromium Run Result

- Command: `npx playwright test --project=chromium`
- Outcome: `118 passed`, `47 skipped`, `0 failed` (165 total)
- Notes: skips were primarily seed/env/state-condition dependent, not assertion failures
| 22. UI/UX behavior | `COVERED-NOT-RUN` | Some smoke and mobile checks exist | Accessibility, focus order, broad visual regression rows |
| 23. Performance/resilience | `MANUAL-GAP` | Basic no-crash smoke only | Slow network, retry, double-submit, navigation recovery, leak checks |
| 24. SEO/marketing pages | `COVERED-NOT-RUN` | Public page smoke exists | Metadata/OG/canonical/content freshness assertions |
| 25. Security/abuse prevention | `CONFIRMED` (partial) | Unauthorized endpoint blocking tested in API suite | XSS sanitization, rate limits, payload leakage, enumeration hardening |
| 26. Cross-browser/device coverage | `MANUAL-GAP` | Chromium-centric current run | Safari/Edge/mobile Safari and touch/file/date cross-browser matrix |
| 27. Release-critical E2E journeys | `CONFIRMED` (partial) | Single broad critical regression passed | Split each journey into deterministic pass/fail specs |
| 28. Manual-only/semi-manual checks | `MANUAL-GAP` | Stripe webhook evidence partially present | Real checkout UX polish, ABN real-world responses, visual/perf clarity checks |

---

## Strict Launch Gate (1-2 Days)

Use this section as the release control sheet. Do not move to the next gate until the current gate is green.

### Current Gate Status

| Gate | Status (`NOT STARTED`/`IN PROGRESS`/`PASS`/`FAIL`) | Owner | Last updated | Blocking issue (if any) |
|---|---|---|---|---|
| Gate 1 - Seed + Env Integrity | `NOT STARTED` | Engineering |  |  |
| Gate 2 - Skip-Dependent Specs | `NOT STARTED` | QA |  |  |
| Gate 3 - Deterministic Blockers | `NOT STARTED` | Engineering |  |  |
| Gate 4 - Cross-Browser/Device | `NOT STARTED` | QA |  |  |
| Gate 5 - Manual Critical Checks | `NOT STARTED` | Product + QA |  |  |
| Gate 6 - Freeze + Final Gate | `NOT STARTED` | Release |  |  |

### Gate 1 - Seed + Env Integrity

- [ ] **Run** `npm run qa:seed`
- [ ] Seed completed with no errors
- [ ] Required users exist: free, premium, unverified, admin
- [ ] Required env vars present and valid (`PW_*`, Supabase, Stripe, ABN provider, `CRON_SECRET`)
- [ ] **Evidence attached** (seed log + seeded IDs snippet)
- [ ] **Result:** `PASS` / `FAIL`
- [ ] **Owner sign-off:** __________  **Date/Time:** __________

### Gate 2 - Skip-Dependent Specs (Admin/Attachments/State)

- [ ] **Run** `npx playwright test playwright/admin.spec.ts --project=chromium`
- [ ] **Run** `npx playwright test playwright/attachments.spec.ts --project=chromium`
- [ ] **Run** `npx playwright test playwright/request-to-quote-qa.spec.ts --project=chromium`
- [ ] 0 failed tests
- [ ] No blocker tests skipped due to missing env/seed/state
- [ ] If any skip exists, rationale is documented and approved as non-blocking
- [ ] **Evidence attached** (Playwright report link/path + skip rationale list)
- [ ] **Result:** `PASS` / `FAIL`
- [ ] **Owner sign-off:** __________  **Date/Time:** __________

### Gate 3 - Deterministic Launch Blocker Assertions

- [ ] **Jobs deterministic flow** confirmed (create -> apply -> owner controls)
- [ ] **Tenders deterministic flow** confirmed (create -> request quote -> accept/decline -> delete/hard-delete rule)
- [ ] **Messaging deterministic flow** confirmed (thread create/reuse + send/receive/order/unread/read)
- [ ] **Availability deterministic flow** confirmed (save/update + past-date restriction + plan limits)
- [ ] **Search deterministic flow** confirmed (trade + radius boundary + premium location rules)
- [ ] No assertion depends on ambiguous seed state
- [ ] **Evidence attached** (spec names + passing run output)
- [ ] **Result:** `PASS` / `FAIL`
- [ ] **Owner sign-off:** __________  **Date/Time:** __________

### Gate 4 - Cross-Browser/Device Critical Coverage

- [ ] Chromium critical journey pass
- [ ] Edge critical journey pass
- [ ] WebKit/Safari-like critical journey pass
- [ ] One mobile profile critical journey pass
- [ ] No browser-specific blockers in auth, navigation, date/file, messaging
- [ ] **Evidence attached** (browser matrix + run output)
- [ ] **Result:** `PASS` / `FAIL`
- [ ] **Owner sign-off:** __________  **Date/Time:** __________

### Gate 5 - Manual Critical Checks

- [ ] ABN real-world response check (valid + invalid + fallback behavior)
- [ ] Stripe webhook idempotency check (duplicate event does not double-apply)
- [ ] Critical UX flow check (signup -> onboarding -> upgrade -> create/post -> message)
- [ ] No unresolved P0/P1 issue in launch-blocker paths
- [ ] **Evidence attached** (manual checklist notes, screenshots, timestamps)
- [ ] **Result:** `PASS` / `FAIL`
- [ ] **Owner sign-off:** __________  **Date/Time:** __________

### Gate 6 - Freeze + Final Release Gate

- [ ] Release branch frozen (only release fixes allowed)
- [ ] **Run** `npm run test:ci:full`
- [ ] **Run** `npx playwright test --project=chromium` (or approved final suite)
- [ ] 0 failed tests in final gate run
- [ ] Blocker matrix fully confirmed (no unresolved `partial` blocker at go-live)
- [ ] **Evidence attached** (final CI/build artifacts)
- [ ] **Result:** `PASS` / `FAIL`
- [ ] **Owner sign-off:** __________  **Date/Time:** __________

---

## Final Go/No-Go Rule

- [ ] **GO** only if all 6 gates are `PASS`
- [ ] **NO-GO** if any gate is `FAIL` or any launch blocker remains unresolved

## Suggested Execution Order

- [ ] Day 1 AM: Gate 1 -> Gate 2
- [ ] Day 1 PM: Gate 3
- [ ] Day 2 AM: Gate 4 -> Gate 5
- [ ] Day 2 PM: Gate 6 + release sign-off

## Release Sign-Off

- [ ] QA Owner: __________  **Decision:** `GO` / `NO-GO`  **Date/Time:** __________
- [ ] Engineering Owner: __________  **Decision:** `GO` / `NO-GO`  **Date/Time:** __________
- [ ] Product Owner: __________  **Decision:** `GO` / `NO-GO`  **Date/Time:** __________
- [ ] Release Owner: __________  **Final Decision:** `GO` / `NO-GO`  **Date/Time:** __________
