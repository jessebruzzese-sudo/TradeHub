# Messaging Blocking Implementation Summary

Implements user blocking for TradeHub messaging on top of the user-pair conversation foundation.

---

## Schema Changes

### Migration: `20260307130000_create_user_blocks.sql`

New table `user_blocks`:

| Column      | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| id          | uuid      | Primary key                          |
| blocker_id  | uuid      | User who created the block (FK users)|
| blocked_id  | uuid      | User who is blocked (FK users)       |
| created_at  | timestamptz | When block was created             |

- `UNIQUE(blocker_id, blocked_id)` – one block per pair
- `CHECK (blocker_id != blocked_id)` – cannot block self
- Indexes on `blocker_id` and `blocked_id`
- RLS: users can view blocks they’re in, create blocks as blocker, delete their own blocks

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/migrations/20260307130000_create_user_blocks.sql` | New migration |
| `src/lib/types.ts` | Added `UserBlock` interface |
| `src/lib/store.ts` | Added `userBlocks`, `isBlocked`, `blockUser`, `unblockUser` |
| `src/lib/messaging-utils.ts` | `getMessagingState` accepts `options.isBlockedByRecipient` |
| `src/app/messages/page.tsx` | Block check in state & send; thread header dropdown; Block User + confirmation dialog |

---

## Send / Composer Behaviour When Blocked

**When user A blocks user B:**

1. **Messaging state** – `getMessagingState` receives `isBlockedByRecipient: true` for B. Returns:
   - `canSendMessages: false`
   - `isReadOnly: true`
   - `disabledReason: 'You cannot send messages in this conversation.'`

2. **MessageInput** – Uses `messagingState.isReadOnly` and shows the locked alert with `disabledReason` instead of the composer.

3. **Send logic** – `handleSendMessage` checks `store.isBlocked(otherUserId, currentUser.id)` before sending. If blocked, sets error and returns.

4. **Thread history** – Messages stay visible; only the composer is disabled.

5. **Blocked user UI** – Sees the message: “You cannot send messages in this conversation.”

---

## Follow-Up Needed

### Unblock flow
- Add “Unblock” in thread header when current user has blocked the other user.
- Or expose unblock in a settings/managed-blocks page.
- `store.unblockUser(blockerId, blockedId)` is implemented; UI is not.

### Admin UI
- Add “Blocks Involving” section to Admin User Profile:
  - Users this account has blocked
  - Users who have blocked this account
- Requires loading `user_blocks` from Supabase and wiring into admin user detail.

### Production / Supabase
- Sync `user_blocks` with Supabase: load on app init, persist `blockUser`/`unblockUser` via API.
- Add server-side block check before inserting messages (RLS or API).
- Run migration: `supabase db push` or equivalent.
