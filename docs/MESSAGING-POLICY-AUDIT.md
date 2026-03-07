# TradeHub Messaging Policy Audit

This document compares the current messaging implementation against the TradeHub Messaging Policy / Specification and identifies gaps.

---

## Executive Summary

| Area | Spec Requirement | Current State | Status |
|------|------------------|---------------|--------|
| **Architecture** | Open messaging; single thread per user pair | Job-based only; conversations require `job_id` | ❌ Major gap |
| **Messaging restrictions** | No restrictions by Premium, ABN, trade, radius, job participation | `trustStatus: 'pending'` blocks messaging | ⚠️ Partial |
| **Platform actions** | Commitment actions may require ABN/ownership | ABN gating on action cards only | ✅ Aligned |
| **Blocking** | Users can block; blocked users cannot send | Not implemented | ❌ Missing |
| **Reporting** | Report users with categories; report to admin | Not implemented | ❌ Missing |
| **Admin visibility** | Reports & blocks on Admin User Profile | Not implemented | ❌ Missing |
| **UI entry points** | Message on Profile, Search, Jobs, Tenders, Discover | Profile: none; Search: none; Discover: generic link | ⚠️ Partial |
| **Thread header** | View Profile, Block User, Report User | View Job only; no Block/Report | ⚠️ Partial |
| **Deleted accounts** | History visible; composer disabled | Not implemented | ❌ Missing |

---

## 1. Core Messaging Principle

### Spec
> Messaging on TradeHub is open between all users. Any logged-in user may start or continue a conversation with any other user they can discover.

### Current State
- **Architecture**: Conversations are **job-based only**. The `conversations` table requires `job_id` (NOT NULL). `findOrCreateConversation(jobId, contractorId, subcontractorId)` requires a job.
- **Implication**: Users cannot message each other unless they share a job context (e.g. contractor posted job, subcontractor applied).
- **Gap**: No way to start a conversation from profile, search, or directory without a job.

### Required Changes
- Introduce **user-pair conversations** (optional `job_id` or separate model for general messaging).
- Support starting conversations from profile, search, discover, jobs, tenders.
- Enforce **single thread per user pair** when opening existing conversations.

---

## 2. Messaging Restrictions

### Spec
> Messaging must NOT be restricted by: Free vs Premium, Trade category, Discovery radius, ABN verification, Job or tender participation.

### Current State
- **ABN verification**: Messaging itself is allowed for unverified users (QA notes confirm this). ✅
- **trustStatus: 'pending'**: `getMessagingState()` in `messaging-utils.ts` blocks messaging for users with `trustStatus === 'pending'`:
  ```ts
  if (currentUser.trustStatus === 'pending') {
    return { canSendMessages: false, isReadOnly: true, disabledReason: '...' };
  }
  ```
- **Job status**: Messaging disabled for cancelled/completed/closed jobs. Spec allows this for platform behaviour (read-only for terminal states).
- **Premium / trade / radius**: No explicit checks in messaging code. ✅

### Required Changes
- Remove or relax `trustStatus === 'pending'` restriction for messaging if the spec intends messaging to be unrestricted. (Clarify: "pending" may mean account not yet approved—spec says "ABN verification" should not restrict messaging; account approval may be different.)

---

## 3. Platform Actions Inside Messages

### Spec
> Commitment actions (Accept Job, Decline, Confirm Hire, Accept Quote, Award Tender) may require ABN verification, job/tender permissions, ownership. Messaging should never be blocked because of these rules.

### Current State
- Commitment action cards (Accept, Decline, Confirm Hire, etc.) are disabled for unverified users with "Verify ABN to continue" CTA.
- Plain message sending remains allowed.
- **Status**: ✅ Aligned with spec.

---

## 4. Blocking Users

### Spec
- User A blocks User B → User B cannot send new messages or start new threads with User A.
- Existing thread remains visible; composer disabled; clear UI message: "You cannot send messages in this conversation."

### Current State
- No blocking functionality.
- No `user_blocks` (or equivalent) table.
- No UI for blocking or blocked-state messaging.

### Required Changes
- Add `user_blocks` table: `blocker_id`, `blocked_id`, `created_at`.
- API/RLS to prevent blocked users from sending messages.
- UI: "Block User" in thread header; disabled composer + message when blocked.
- Enforce on send: reject if sender is blocked by recipient.

---

## 5. Reporting Users

### Spec
- Report from message thread.
- Categories: Harassment, Spam, Scam, Inappropriate content, Other.
- Store: reporter, reported user, conversation reference, category, optional message.
- Options: Report only, or Report and block.

### Current State
- No reporting functionality.
- No `user_reports` table.
- No report UI.

### Required Changes
- Add `user_reports` table: `reporter_id`, `reported_id`, `conversation_id`, `category`, `message`, `created_at`, `status`.
- Report dialog in thread header.
- API to create report and optionally block.

---

## 6. Admin Visibility

### Spec
- Admin User Profile must show:
  - **Reports Received**: list of reports against the user (reporter, date, category, conversation ID, excerpt, status).
  - **Blocks Involving**: users this account has blocked; users who have blocked this account (user, date, active).

### Current State
- `admin-user-detail-client.tsx` has Account Review, ABN, Audit Log, Admin Notes.
- No "Reports Received" or "Blocks Involving" sections.

### Required Changes
- Add "Reports Received" section (requires `user_reports`).
- Add "Blocks Involving" section (requires `user_blocks`).

---

## 7. Conversation Behaviour Rules

### Spec
- Single thread per user pair; clicking Message opens existing thread.
- Only participants may view thread.
- Deleted/deactivated accounts: history visible, composer disabled, "Deleted user" or "Inactive account" label.

### Current State
- **Single thread**: Per (job, contractor, subcontractor). No user-pair threads without job.
- **Access**: Participants only (conversation filtered by contractor/subcontractor).
- **Deleted accounts**: Not handled; no `deleted_at` or `is_active` checks.

### Required Changes
- Implement single-thread-per-user-pair when user-pair conversations exist.
- Add handling for deleted/inactive accounts (disable composer, show label).

---

## 8. Moderation Capability

### Spec
- Admins: view reports, view conversation context, suspend accounts, mark reports reviewed/resolved, identify repeated abuse.
- Moderation actions should not delete conversation history.

### Current State
- Admins can suspend via Account Review.
- No report workflow; no report status (open/reviewed/resolved).
- No conversation context linked to reports in admin UI.

### Required Changes
- Report status and admin actions (reviewed/resolved).
- Link reports to conversation context for admins.

---

## 9. UI Locations

### Spec
| Location | Required | Current State |
|----------|----------|---------------|
| Profile Page | Message button | ❌ No Message button |
| Search Results | Message on each user card | ❌ Only "View" button; links to profile |
| Discover (trade) | Message button | ⚠️ Button links to `/messages` (no user context); TODO: `/messages/new?userId=...` |
| Jobs | Message poster | ✅ `handleMessagePoster` → findOrCreateConversation |
| Tenders | (implied) | Needs verification |
| Thread Header | View Profile, Block User, Report User | ⚠️ View Job only; no Block/Report |

### Required Changes
- Add Message button on profile (when viewing another user).
- Add Message button on search result cards.
- Fix Discover: Message should open/create conversation with that user.
- Add thread header menu: View Profile, Block User, Report User.

---

## 10. Design Philosophy

### Spec
> Messaging should feel open, professional, frictionless, safe. Communication should never be artificially restricted. Safety tools exist to protect users without limiting normal interaction.

### Current State
- Job-based model creates friction: users must have a job context to message.
- `trustStatus: 'pending'` restricts some users.
- No safety tools (block/report) yet.

---

## Implementation Priority

| Priority | Item | Effort | Dependencies |
|----------|------|--------|--------------|
| P0 | User-pair conversations (architecture) | High | Schema, store, API |
| P0 | Message entry points (Profile, Search, Discover) | Medium | P0 |
| P1 | Blocking (table, API, UI) | Medium | - |
| P1 | Reporting (table, API, UI) | Medium | - |
| P1 | Admin: Reports & Blocks on user profile | Medium | P1 |
| P2 | Remove trustStatus restriction (if intended) | Low | - |
| P2 | Deleted/inactive account handling | Low | - |
| P2 | Thread header: View Profile, Block, Report | Low | P1 |

---

## Reference Spec (Summary)

1. **Core**: Open messaging; any user can message any discoverable user.
2. **Restrictions**: None for Premium, trade, radius, ABN, job participation.
3. **Platform actions**: May require ABN/ownership; messaging never blocked.
4. **Blocking**: Block → blocked user cannot send; composer disabled; clear message.
5. **Reporting**: Report from thread; categories; report to admin; optional block.
6. **Admin**: Reports Received + Blocks Involving on user profile.
7. **Rules**: Single thread per user pair; participants only; deleted accounts handled.
8. **Moderation**: View reports, suspend, mark resolved; no auto-delete of history.
9. **UI**: Message on Profile, Search, Discover, Jobs, Tenders; thread menu: View Profile, Block, Report.
