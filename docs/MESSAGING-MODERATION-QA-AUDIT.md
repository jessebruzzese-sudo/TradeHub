# FINAL MESSAGING QA RESULT

**Date:** 2025-03-07  
**Scope:** TradeHub messaging and moderation system

---

## Status: **PASS WITH MINOR ISSUES**

---

## What is confirmed working

- **Direct user-to-user messaging**: API accepts `conversationId` or `(contractorId, subcontractorId)`; creates conversation when missing; enforces participant and block checks.
- **Single conversation per user pair**: Partial unique index `conversations_direct_user_pair_unique` enforces one thread per pair when `job_id IS NULL`; canonical ordering (p1 < p2) used consistently.
- **Message entry points**: Profile, Search, Discover use `?userId=`; job detail uses `?conversation=`; job-not-fulfilled uses `?job=` (resolved to `?userId=`). All routes work.
- **Blocking users**: `user_blocks` table, RLS, GET/POST `/api/user-blocks`; messages page loads blocks on mount, block UI with confirmation; block check in messages INSERT policy.
- **Reporting users**: `user_reports` table with `conversation_id`; POST `/api/user-reports`; report dialog with category, notes, `alsoBlock`; reports persisted correctly.
- **Admin user profile safety sections**: GET `/api/admin/users/[id]/messaging-safety`; Reports Received, Reports Submitted, Blocks Involving User; links to `/admin/messages/[conversationId]`.
- **Admin transcript review page**: `/admin/messages/[conversationId]` loads conversation, participants, messages; read-only; no composer.
- **Report context on transcript page**: API returns `reports` for conversation; card shown when `reports.length > 0`; 0 reports: card hidden; 1+ reports: full details (reporter, reported, category, status, notes, date).
- **Attachment viewing**: `MessageAttachments` shows name/type; View link only when `bucket` and `path` exist; missing bucket/path fails gracefully (no View button, no crash).
- **Admin access enforcement**: `requireAdmin()` on all admin APIs (messaging-safety, conversations, storage/signed-url, user-reports PATCH); admin layout blocks non-admins; RLS + service role used correctly.
- **Schema matches code**: `conversations`, `messages`, `user_blocks`, `user_reports` align with migrations; no job-only assumptions break direct messaging.

---

## Minor issues / polish gaps

1. **Attachment View error handling**: `handleView` in `MessageAttachments` does not check `res.ok` or catch fetch errors; user sees "Loading..." then nothing. Add try/catch, check `res.ok`, show toast or inline error.
2. **No unblock API**: `user-blocks` has no DELETE; `store.unblockUser()` exists but no API or UI to unblock.
3. **FindOrCreate race**: Two concurrent first messages for same pair can both try to insert conversation; one hits 23505. API does not catch and retry with SELECT.
4. **No admin middleware**: Middleware does not protect `/admin/*`; protection is layout + API only (defense in depth recommended).
5. **Report status actions only on user profile**: Admins must go to user profile to change report status; no quick actions on transcript page.

---

## Potential production risks

1. **Conversations/messages not loaded from DB (CRITICAL)**: `store.conversations` and `store.messages` come from mock data (empty in production). There is no API to load the user's conversations or messages from Supabase. Users only see conversations created in the current session. After refresh or on a new device, the conversation list is empty. Users cannot see existing message history.
2. **Conversation ID mismatch on direct link**: If a user visits `/messages?conversation=<realDbId>` (e.g. from bookmark) and that conversation is not in the store, `getConversationById` returns undefined; user sees empty/select state.
3. **Message attachments**: Messages send API does not support attachments; `attachments` is always `[]`. Admin attachment View will work when/if message attachments are implemented with `{ bucket, path, name, type }`.

---

## Files/areas checked

| Category | Files |
|----------|-------|
| Migrations | `20251231090645_create_initial_schema.sql`, `20260307120000_conversations_user_pair.sql`, `20260307130000_create_user_blocks.sql`, `20260307140000_messages_insert_block_check.sql`, `20260307150000_create_user_reports.sql` |
| API | `messages/send/route.ts`, `user-blocks/route.ts`, `user-reports/route.ts`, `admin/conversations/[conversationId]/route.ts`, `admin/users/[id]/messaging-safety/route.ts`, `admin/storage/signed-url/route.ts`, `admin/user-reports/[id]/route.ts` |
| UI | `messages/page.tsx`, `admin/messages/[conversationId]/page.tsx`, `admin/users/[id]/admin-user-detail-client.tsx`, `profile-view.tsx`, `search/page.tsx`, `discover/[trade]/page.tsx`, `jobs/[id]/page.tsx`, `job-not-fulfilled-banner.tsx` |
| Lib | `messaging-utils.ts`, `store.ts`, `mock-data.ts`, `admin/require-admin.ts`, `is-admin.ts` |
| Layout / Middleware | `admin/layout.tsx`, `admin-layout-client.tsx`, `middleware.ts` |

---

## Recommended final cleanup

1. **Conversations/messages hydration (HIGH)**: Add GET `/api/conversations` (and optionally `/api/messages?conversationId=`) to load the user's conversations and messages from Supabase. Hydrate the store on the messages page mount. Without this, production messaging is effectively non-functional for returning users.
2. **Attachment View error handling**: In `MessageAttachments` `handleView`, add try/catch, check `res.ok`, show toast on failure.
3. **FindOrCreate race**: In `messages/send/route.ts`, on unique violation (23505) when inserting conversation, catch error, SELECT existing conversation, proceed with message insert.
4. **Unblock**: Add DELETE `/api/user-blocks` (or `?blockId=`) and unblock UI (e.g. in blocked users list or settings).
5. **Admin middleware**: Add middleware check for `/admin/*` to redirect non-admins before page load (defense in depth).
6. **Documentation**: Update any messaging docs to reflect user-pair model and direct messaging; document the conversations hydration gap for production.
