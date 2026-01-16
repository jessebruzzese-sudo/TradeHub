Purpose
Confirm TradeHub’s core functionality works as intended using one user account model, with behaviour controlled by role, subscription, and permissions — not account type.


Tester: _______________

1. Accounts & Setup

☐ User can sign up successfully
☐ User can log in successfully
☐ Session persists after page refresh
☐ Logging out fully signs the user out (no auto re-login)
☐ Refresh after logout stays logged out
  Users Can successfully change profile avatar, avatar should stay on account via supabase

2. Authentication & Navigation

☐ Signup validation works (clear errors shown)
☐ Invalid login shows correct error
☐ Visiting a protected page while logged out redirects to login
☐ After login, user returns to original page
☐ Back button does not restore logged-in state after logout

3. Roles & Permission Behaviour

Using the same user account system, verify behaviour changes correctly:

☐ User with contractor permissions can create a tender
☐ User without contractor permissions cannot create a tender
☐ User with subcontracting permissions can list availability
☐ UI hides actions the user cannot perform
☐ Restricted actions are blocked server-side (not UI-only)

4. Tender Visibility & Trades

Create a tender requiring Electrician + Plumber:

☐ User with Electrician trade sees tender
☐ User with Plumber trade sees tender
☐ User with Carpenter trade does NOT see tender

Tender detail page:
☐ Electrician user sees only main + electrician content
☐ Plumber user sees only main + plumber content

5. Quotes / Applications

☐ Eligible user can apply or submit a quote
☐ User cannot quote on their own tender
☐ Tender must be LIVE to accept quotes

Limited Quotes enabled:
☐ All quote attempts are blocked
☐ Correct message is shown

6. Messaging

☐ Job/tender thread is created correctly
☐ Only users involved can access the thread
☐ Messages send and receive correctly
☐ Refresh preserves message history
☐ Unread indicators behave correctly

7. Availability Listings

☐ User can list availability dates
☐ Availability description saves correctly
☐ Dates display accurately (no timezone issues)
☐ Past dates handled correctly
☐ Availability can be edited or removed

8. ABN / Verification Rules

☐ Unverified users can still:

List availability

Apply for standard jobs

Access dashboard

☐ Features that require verification or upgrade show correct prompts
☐ Verification does not unintentionally block onboarding

9. Premium Feature Gating

☐ Multi-trade selection requires upgrade
☐ Non-premium users see lock or upgrade CTA
☐ Premium users can access gated features

Search-from-location (if enabled):
☐ Premium users use search-from location
☐ Non-premium users use base location only
☐ Base location is not overwritten

10. Admin (If Applicable)

☐ Admin login works
☐ Admin pages load without errors
☐ User lists and detail views work
☐ Non-admin users cannot access admin routes

11. Security & Edge Cases

☐ Invalid return URLs are blocked
☐ Direct access to restricted routes is blocked
☐ Users cannot access or edit other users’ data
☐ No major console errors during normal use

12. UX & Stability

☐ Mobile layout usable
☐ No broken layouts or overlapping elements
☐ No infinite loading states
☐ App feels stable during normal usage

Bug Reporting (Required)

For every issue found, include:

Steps to reproduce

Expected vs actual result

Screenshot or screen recording

Console or network errors

Severity (Critical / Major / Minor)


13. Branding / Logo Update

☐ New TradeHub logo files received and added to the repo
☐ Logo updated in header/nav (desktop + mobile)
☐ Logo updated on landing/hero (if shown there)
☐ Logo updated on auth pages (login/signup)
☐ Logo updated on favicon / app icon (browser tab)
☐ No old logo appears anywhere in the app (search “logo” + visual check)
☐ Logo looks correct on light/dark backgrounds and different screen sizes

Notes:

Confirm no broken image links

Confirm image sizing/alignment doesn’t shift layout
