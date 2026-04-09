TradeHub QA Test Plan — DEV Fixes
Goal

Validate that the major platform fixes now work in real-world use:

messaging
posting jobs
search
browse subcontractors trade filtering
profile strength
dashboard metrics
admin controls
support link
Test setup

Use at least:

1 admin account
2 free user accounts in different trades
1 premium user account
1 additional normal user for messaging/job interaction

Recommended trade mix:

Plumber
Electrician
Carpenter
Premium plumber or premium electrician
1. Account creation and admin signup alert
Test

Create a brand new TradeHub account.

Expected result
Account is created successfully
Admin dashboard shows a new signup alert or pending review entry
New signup appears in recent signups/admin review area
Fail if
Account creates but no admin alert appears
Signup appears delayed or not at all
Admin count is wrong
2. Messaging between users
Test

From User A:

open another user’s profile
click Message
send a message

From User B:

open inbox
confirm message is visible
reply

From User A:

confirm reply is received
Expected result
conversation opens correctly
messages send successfully
both users see the same thread
no blank thread, failed send, or hidden conversation
unread count increases before opening, then clears after opening thread
Fail if
clicking message does nothing
thread opens but messages do not load
sent messages do not appear for recipient
unread count stays wrong
3. Admin direct messaging
Test

From admin user page:

open a user profile in admin
click Message User
send a message
Expected result
admin can start or reuse a direct thread
normal user receives the admin message in inbox
reply path works both ways
Fail if
button is missing
message thread fails to create
user does not receive admin message
4. Post job flow
Test

Using a valid contractor/trade account:

go to Post Job
complete all required fields
submit

Then:

check job appears in relevant listings
open the job detail page
Expected result
form submits successfully
no silent failure
job saves correctly
job appears in listings immediately if it meets normal visibility rules
Fail if
submit hangs
error appears unexpectedly
job saves but does not show up
wrong trade or job details saved
5. Browse subcontractors — same trade logic
Test

Log in as a free Plumbing user and visit Browse Subcontractors.

Expected result
only plumbing users are shown by default
non-plumbing users are not shown

Repeat with an Electrical user.

Fail if
other trades appear for free users
wrong trade results show up
empty state appears even though matching users exist
6. Premium browse subcontractors behavior
Test

Log in as a premium user:

open Browse Subcontractors
select multiple trades
optionally use browse all if available
Expected result
premium user can view selected multiple trades
results reflect selected trades correctly
behavior stays stable when toggling filters
Fail if
premium still behaves like free
selected trades do not change results
wrong users appear
7. Search logic
Test

On the search page:

search by name
search by trade
search by partial keyword
search with and without filters

Use accounts you already know should match.

Expected result
valid matches appear
no false empty states when users exist
results are relevant to the search term
visible/public users appear correctly
Fail if
obvious matches are missing
results are empty when data exists
irrelevant users dominate
search behaves inconsistently between refreshes
8. Premium users rank first on search
Test

Search for a term that returns both premium and non-premium users in the same trade.

Expected result
premium users appear above non-premium users
within that order, results still look sensible by strength/relevance/rating
Fail if
non-premium users appear above premium without a clear reason
ordering changes randomly between loads
9. Profile strength logic
Test

Open a user profile and record current profile strength.
Then update profile fields such as:

ABN
bio
profile image
links/socials
trade fields
phone visibility or other completion items

Refresh profile.

Expected result
score changes appropriately
band/category updates correctly
score is not stuck at 0
changes feel consistent with profile completeness
Fail if
score does not move after meaningful edits
score remains 0 despite complete profile
frontend score clearly disagrees with actual profile state
10. Dashboard performance bar
Test

For a normal user, verify:

Profile views
Jobs
Unread messages

Run supporting actions:

view the profile from another account
send unread messages
create a job if applicable

Then refresh dashboard.

Expected result
counts update to reflect real activity
unread messages drop after thread is opened/read
jobs count reflects actual visible jobs logic
profile views increase after another user views the profile
Fail if
all metrics stay at 0
unread count never changes
profile views never move
jobs count is obviously wrong
11. Admin jobs moderation
Test

As admin:

open admin jobs list
open several job detail pages
delete a job
Expected result
admin can view all jobs, including older ones
detail pages load correctly
delete works and removes the job from admin list and normal user view where applicable
Fail if
some jobs show “not found”
delete fails
only recent jobs appear
12. Admin premium upgrade
Test

As admin:

open a user
grant premium
have that user refresh and test premium-only features

Then:

remove premium if safe to test on a non-live billing account
Expected result
premium status updates correctly
premium features unlock
admin can control premium without touching Supabase manually
Fail if
upgrade button does nothing
user still behaves as free
removing premium leaves account in broken state
13. Admin ban / delete moderation
Test

As admin:

ban a normal user
try to use that user account
restore if needed
soft-delete a test user
confirm access is blocked
Expected result
banned user cannot continue using app
deleted/suspended user is blocked correctly
restore/unban returns access where intended
Fail if
banned user can still browse/use app
deleted user still behaves normally
admin cannot restore safely
14. Help / Support link
Test

Check Help / Support from:

header
mobile menu
dashboard/sidebar
Expected result
each opens email to support@tradehub.com.au
Fail if
wrong email opens
dead link
inconsistent behavior across menus
Pass / fail template for testers

Use this simple format for each section:

Test name:
Pass or fail:
What happened:
Screenshot attached: Yes / No
Device used:
Account used:

Example:

Test name: Messaging between users
Pass or fail: Fail
What happened: Message sent from User A but did not appear for User B until full refresh
Screenshot attached: Yes
Device used: iPhone 15
Account used: plumber_test_1

Priority order for your testers

Have them test in this order:

Account signup + admin alerts
Messaging
Post job
Search
Browse subcontractors
Profile strength
Dashboard metrics
Admin controls
Help/support link

That order follows the most important launch-risk areas first, based on the fixes described in your dev notes.
