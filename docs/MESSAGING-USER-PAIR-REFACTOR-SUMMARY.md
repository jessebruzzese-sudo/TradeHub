# Messaging User-Pair Refactor Summary

Refactored TradeHub messaging from job-only conversations to user-pair conversations. One direct message thread per user pair; job context is optional metadata.

---

## Schema Changes

### Migration: `20260307120000_conversations_user_pair.sql`

1. **`job_id` nullable** – `conversations.job_id` is now optional (was `NOT NULL`).
2. **FK updated** – `job_id` references `jobs(id) ON DELETE SET NULL` (was `ON DELETE CASCADE`). Deleting a job no longer deletes the conversation.
3. **Old unique constraint removed** – `UNIQUE(job_id, contractor_id, subcontractor_id)` dropped.
4. **New partial unique index** – One direct thread per user pair when `job_id IS NULL`:
   ```sql
   CREATE UNIQUE INDEX conversations_direct_user_pair_unique
     ON conversations (LEAST(contractor_id, subcontractor_id), GREATEST(contractor_id, subcontractor_id))
     WHERE job_id IS NULL;
   ```
5. **Index added** – `idx_conversations_user_pair` on `(contractor_id, subcontractor_id)` for lookups.

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/migrations/20260307120000_conversations_user_pair.sql` | New migration |
| `src/lib/types.ts` | `Conversation.jobId` optional |
| `src/lib/store.ts` | `findOrCreateConversationByUserPair`, `ensureUserInStore`, `getConversationForJob`; `findOrCreateConversation` delegates to user-pair |
| `src/lib/messaging-utils.ts` | `getMessagingState` allows messaging when `job` is null |
| `src/lib/database.types.ts` | `conversations.job_id` nullable in Row/Insert |
| `src/app/messages/page.tsx` | `?userId=` handling; conversation list supports no-job; empty state copy |
| `src/components/profile/profile-view.tsx` | Message button when viewing another user |
| `src/app/search/page.tsx` | Message button on user cards; `ensureUserInStore` before navigate |
| `src/app/discover/[trade]/page.tsx` | Message button routes to `/messages?userId=` |
| `src/app/admin/jobs/[id]/page.tsx` | Uses `getConversationForJob` instead of `jobId` lookup |
| `src/app/jobs/[id]/page.tsx` | Uses `getConversationForJob` for system messages on complete/cancel |
| `src/app/messages/page.tsx` | Handles `?job=` param (redirects to `?userId=` for job-not-fulfilled-banner) |

---

## Migration / Backfill Concerns

1. **Existing rows** – Current rows keep `job_id`. No backfill or merge.
2. **Unique index** – Applies only when `job_id IS NULL`. Existing job-based rows are unaffected.
3. **FK `ON DELETE SET NULL`** – Deleting a job sets `job_id` to `NULL` instead of deleting the conversation.
4. **No merge of job-based threads** – Multiple job-based threads for the same user pair remain. New direct threads are created with `job_id = NULL`. `getConversationForJob` prefers `job_id` match, then falls back to user-pair lookup.

---

## Areas That Still Assume Job-Only Messaging

1. **Supabase RLS** – Policies use `contractor_id` and `subcontractor_id`; no job-specific checks. Still valid.
2. **API / server-side** – No messaging API changes in this pass; app uses in-memory store.
3. **Tenders** – Tender-related messaging (if any) was not audited; may still be job/tender-scoped.
4. **`MESSAGING_SYSTEM_DOCUMENTATION.md`** – Still describes job-based messaging; should be updated.
5. **`TrustSafetySection.tsx`** – Copy: "Keep conversations organised with job-based threads" – outdated.
6. **`job-not-fulfilled-banner.tsx`** – Links to `/messages?job=${jobId}`; messages page handles `?job=` by resolving contractor and redirecting to `?userId=`.

---

## Behaviour Summary

- **One thread per user pair** – `findOrCreateConversationByUserPair` finds or creates a single thread for two users.
- **Job context optional** – `findOrCreateConversation(jobId, contractorId, subcontractorId)` calls the user-pair helper and passes `jobId` as metadata when creating.
- **Message entry points** – Profile, Search, and Discover have Message buttons that go to `/messages?userId=X`, which finds/creates the thread and redirects to `/messages?conversation=Y`.
- **Job-based flows** – "Message Poster" on job pages still works; it uses the same user-pair thread.
- **Admin** – Admin job detail uses `getConversationForJob` to resolve the conversation by job or user pair.
