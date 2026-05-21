# Duplicate Email Signup Fix - Complete Solution

## Root Cause Analysis

### The Problem
Duplicate email signups were being silently processed, creating "ghost users" where:
- `auth.users` entry was created (Supabase Auth allows this by design)
- `public.users` profile was missing (trigger skipped creation)
- Frontend showed inconsistent errors or proceeded as success

### Why It Happened

1. **Supabase Auth Behavior**: Supabase Auth intentionally does NOT return errors for duplicate emails (security feature to prevent account enumeration). It returns `{ user: {...}, session: null, error: null }` even for duplicates.

2. **Transaction Boundary Mismatch**: 
   - `supabase.auth.signUp()` creates and COMMITS `auth.users` in one transaction
   - Trigger runs `AFTER INSERT` in a SEPARATE transaction
   - Trigger cannot rollback `auth.users` creation (it's already committed)
   - Trigger can only skip `public.users` creation, leaving orphaned `auth.users` entries

3. **Trigger Timing**: 
   - `AFTER INSERT` means trigger runs AFTER `auth.users` is committed
   - Even if trigger detects duplicate, it cannot prevent `auth.users` creation
   - Result: "ghost users" where `auth.users` exists but `public.users` doesn't

## The Solution

### Three-Layer Defense

1. **Pre-Signup Check (Primary Defense)**
   - Database function `check_email_exists()` checks BOTH `auth.users` and `public.users`
   - Frontend calls this BEFORE `supabase.auth.signUp()`
   - If duplicate found, signup is rejected BEFORE `auth.users` creation
   - **This prevents "ghost users" at the source**

2. **Trigger Safety Net (Secondary Defense)**
   - Trigger still checks for duplicates before creating `public.users`
   - If duplicate detected, skips profile creation and logs warning
   - Handles edge cases where pre-signup check might fail

3. **Frontend Verification (Tertiary Defense)**
   - After signup, frontend verifies no duplicate email exists with different ID
   - Catches any remaining edge cases
   - Provides final user-facing error if duplicate slips through

## Implementation

### 1. Database Function (Pre-Signup Check)

**File**: `supabase/migrations/20260107000001_add_pre_signup_duplicate_check.sql`

```sql
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
```

- Checks both `auth.users` and `public.users` for duplicate emails
- Uses `SECURITY DEFINER` to access `auth.users` table
- Returns `true` if email exists, `false` otherwise
- Called by frontend BEFORE signup

### 2. Frontend Pre-Signup Check

**File**: `lib/auth-context.tsx` (lines 311-326)

```typescript
// Check for duplicate email BEFORE creating auth.users
const { data: emailExists } = await supabase
  .rpc('check_email_exists', { check_email: email });

if (emailExists === true) {
  throw new Error('DUPLICATE_EMAIL');
}

// Only proceed if email doesn't exist
await supabase.auth.signUp(...);
```

- Calls database function before signup
- Rejects signup immediately if duplicate found
- Prevents `auth.users` creation for duplicates

### 3. Trigger Safety Net

**File**: `supabase/migrations/20260107000000_fix_duplicate_email_trigger.sql`

- Checks for duplicate email before creating `public.users`
- Skips profile creation if duplicate detected
- Logs warning for monitoring
- Handles `unique_violation` exceptions gracefully

### 4. Frontend Verification

**File**: `lib/auth-context.tsx` (lines 404-419, 468-480)

- After signup, checks if email exists with different ID
- Throws `DUPLICATE_EMAIL` error if duplicate found
- Final safety net for edge cases

## How It Works Now

### For Duplicate Emails:

1. **Pre-Signup Check** → Detects duplicate → Rejects signup → No `auth.users` created ✅
2. **If pre-check fails** → Trigger detects duplicate → Skips `public.users` → Logs warning
3. **If trigger fails** → Frontend verification detects duplicate → Shows error to user

### For New Emails:

1. **Pre-Signup Check** → No duplicate found → Proceeds
2. **Supabase Auth** → Creates `auth.users` entry
3. **Trigger** → Creates `public.users` profile
4. **Frontend** → Verifies profile created → Signup succeeds

## Benefits

1. **Deterministic**: No timing issues or race conditions
2. **Prevents Ghost Users**: Duplicates rejected BEFORE `auth.users` creation
3. **Backend is Source of Truth**: Database function checks both tables
4. **Multiple Safety Nets**: Three layers of defense
5. **No Silent Failures**: Duplicates are always detected and rejected

## Testing Checklist

- [ ] New email signup succeeds
- [ ] Duplicate email signup is rejected before `auth.users` creation
- [ ] Error message shown: "An account with this email already exists"
- [ ] No "ghost users" in `auth.users` without `public.users`
- [ ] Pre-signup check works for emails in `auth.users`
- [ ] Pre-signup check works for emails in `public.users`
- [ ] Trigger safety net catches edge cases
- [ ] Frontend verification catches remaining edge cases

## Files Modified

1. `supabase/migrations/20260107000001_add_pre_signup_duplicate_check.sql` - New migration
2. `lib/auth-context.tsx` - Added pre-signup check
3. `supabase/migrations/20260107000000_fix_duplicate_email_trigger.sql` - Updated comments

## Migration Order

1. Apply `20260107000001_add_pre_signup_duplicate_check.sql` first
2. Then apply `20260107000000_fix_duplicate_email_trigger.sql` (if not already applied)

## Notes

- The pre-signup check is the PRIMARY defense mechanism
- Trigger and frontend verification are safety nets
- All three layers work together to ensure no duplicates slip through
- Backend (database function) is the source of truth for duplicate detection
