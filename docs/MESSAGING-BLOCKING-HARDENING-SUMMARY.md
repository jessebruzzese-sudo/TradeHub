# Messaging Blocking Production Hardening Summary

Block checks are now enforced server-side and backed by Supabase. Client logic remains for UX; the real enforcement is in the API and RLS.

---

## a) Where Block Checks Are Enforced

| Layer | Location | What It Does |
|-------|----------|--------------|
| **API** | `POST /api/messages/send` | Before insert: queries `user_blocks` for both directions (recipient→sender, sender→recipient). Returns 403 with `"You cannot send messages in this conversation."` if either block exists. |
| **RLS** | `messages` INSERT policy | WITH CHECK subqueries block insert when either participant has blocked the other. Defense in depth if API is bypassed. |
| **Client** | `messages/page.tsx` | Uses `store.isBlocked()` for UI (disabled composer, clear message). Calls API for send; handles 403 and shows the same error. |

---

## b) Check Implementation (DB / RLS / RPC / Server Helper)

| Check | Type | Details |
|-------|------|---------|
| **API block check** | Server helper | Two parallel `user_blocks` queries in `POST /api/messages/send`: (blocker=recipient, blocked=sender) and (blocker=sender, blocked=recipient). |
| **RLS block check** | DB/RLS | `messages` INSERT policy uses `NOT EXISTS` subqueries against `user_blocks` for both directions. |
| **user_blocks read** | Supabase | `GET /api/user-blocks` reads from `user_blocks` via Supabase client. Client loads blocks on messages page mount. |
| **user_blocks write** | Supabase | `POST /api/user-blocks` inserts into `user_blocks` via Supabase client. Client calls this when blocking. |

No RPCs are used; all logic is in API routes and RLS policies.

---

## c) Remaining Bypass Risks

| Risk | Mitigation |
|------|------------|
| **Direct Supabase client insert** | RLS blocks inserts when a block exists. |
| **Service role / admin client** | Service role bypasses RLS. Any server code using the service role must enforce block checks before inserting messages. |
| **Stale blocks in client** | Client fetches blocks on messages page load. If blocks change elsewhere, client may be stale until refresh. API and RLS still enforce on send. |
| **Conversations created outside API** | If conversations are created via another path (e.g. direct Supabase), the API can create them on first send using `contractorId` and `subcontractorId`. |
| **System messages** | System messages (job status, etc.) still use `store.addMessage` and are not sent through the API. They are in-memory only. If system messages are later persisted to Supabase, they should either bypass block checks (as system-generated) or go through a separate path that enforces blocks. |

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/migrations/20260307140000_messages_insert_block_check.sql` | New migration: RLS policy for `messages` INSERT with block checks |
| `src/app/api/messages/send/route.ts` | New API: block check, optional conversation creation, insert into `messages` |
| `src/app/api/user-blocks/route.ts` | New API: GET blocks, POST create block |
| `src/app/messages/page.tsx` | Load blocks from API, send via API, block via API, sync conversation ID |
| `src/lib/store.ts` | `setUserBlocks`, `syncConversationId` |

---

## Error Mapping

When blocked, the API returns:

- **Status**: 403
- **Body**: `{ error: "You cannot send messages in this conversation." }`

This matches the existing UI message used when `isBlockedByRecipient` is true.
