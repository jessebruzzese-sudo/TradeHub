# Messaging User Reporting Implementation Summary

User reporting is implemented on top of the existing user-pair messaging and blocking system.

---

## a) Schema Changes

### Migration: `20260307150000_create_user_reports.sql`

New table `user_reports`:

| Column           | Type      | Description                          |
|------------------|-----------|--------------------------------------|
| id               | uuid      | Primary key                          |
| reporter_id      | uuid      | User who submitted the report (FK users) |
| reported_id      | uuid      | User being reported (FK users)       |
| conversation_id  | uuid      | Optional thread reference (FK conversations, ON DELETE SET NULL) |
| category         | text      | One of: harassment, spam, scam, inappropriate_content, other |
| notes            | text      | Optional additional details         |
| status           | text      | open, reviewed, resolved, dismissed (default: open) |
| created_at       | timestamptz | When report was created            |
| updated_at       | timestamptz | Last update                        |

- `CHECK (reporter_id != reported_id)` – cannot report self
- Indexes on reporter_id, reported_id, status, created_at
- RLS: users can create and view their own reports

---

## b) Files Changed

| File | Changes |
|------|---------|
| `supabase/migrations/20260307150000_create_user_reports.sql` | New migration |
| `src/app/api/user-reports/route.ts` | New API: POST to create report, optional alsoBlock |
| `src/app/messages/page.tsx` | Report User menu item, report dialog (category, notes, also block), handleReportUser |

---

## c) Report Flow UX

1. **Entry point**: Thread header dropdown (⋯) → "Report User"
2. **Dialog opens** with:
   - **Category** (required): Harassment or abusive behaviour, Spam, Scam or suspicious behaviour, Inappropriate content, Other
   - **Additional details** (optional): Free-text notes
   - **Also block this user** (optional): Checkbox to block after reporting
3. **Submit**: "Submit report" (disabled until category is selected)
4. **On success**:
   - If "Also block" checked: toast "Report submitted. User has been blocked." + block applied
   - Otherwise: toast "Report submitted. Thank you for helping keep TradeHub safe."
5. **On cancel**: Dialog closes and form resets

---

## d) What Remains for Admin Profile Visibility

Per the messaging policy spec, the Admin User Profile page should show:

**Reports Received** (reports against this user):
- Reporter user
- Date
- Report category
- Conversation ID
- Message excerpt (optional)
- Status (open / reviewed / resolved / dismissed)

**Blocks Involving** (already planned in blocking summary):
- Users this account has blocked
- Users who have blocked this account

**To implement**:
1. Admin API or Supabase query to fetch reports where `reported_id = target_user_id`
2. "Reports Received" section in `admin-user-detail-client.tsx`
3. Admin actions to update report status (reviewed, resolved, dismissed) – not in this pass
