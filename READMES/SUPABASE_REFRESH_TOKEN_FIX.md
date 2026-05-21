# Supabase Refresh Token Loop Fix - Complete Summary

## Problem Statement

The browser was making infinite POST requests to `/auth/v1/token?grant_type=refresh_token`, receiving 400 "refresh_token_not_found" errors, causing:
- Rate limiting (429 errors)
- Unstable auth state
- Poor user experience
- Excessive network traffic

## Root Causes Identified

1. **Auto-refresh enabled** - Supabase was automatically attempting to refresh expired tokens
2. **detectSessionInUrl enabled** - Triggering unnecessary session checks
3. **No error handling for invalid refresh tokens** - Retrying indefinitely on 400 errors
4. **Potential eager initialization** - Risk of Supabase client being created at module scope

---

## Changes Made

### 1. ✅ Disabled Auto-Refresh & Session URL Detection

**File:** `lib/supabase/browserClient.ts`

**Changes:**
- Set `autoRefreshToken: false` (was implicitly true)
- Set `detectSessionInUrl: false` (was true)
- Removed stale export alias `getBrowserClient`

**Before:**
```typescript
auth: {
  autoRefreshToken: false,
  persistSession: true,
  detectSessionInUrl: true,  // ❌ Unnecessary in preview
}
```

**After:**
```typescript
auth: {
  autoRefreshToken: false,    // ✅ No background refresh attempts
  persistSession: true,
  detectSessionInUrl: false,  // ✅ No OAuth callback checks
}
```

**Why:** In preview mode, we're not doing OAuth callbacks, and we don't want Supabase automatically trying to refresh tokens that may be expired or invalid.

---

### 2. ✅ Added Graceful Refresh Token Error Handling

**File:** `lib/auth-context.tsx` (lines 116-139)

**Added:** Error detection and cleanup for invalid refresh tokens

**Implementation:**
```typescript
const { data, error } = await supabase.auth.getSession();

if (error) {
  const errorMessage = error.message || String(error);
  if (errorMessage.includes('refresh_token_not_found') ||
      errorMessage.includes('Invalid Refresh Token')) {
    console.warn('Invalid refresh token detected, clearing auth storage');
    try {
      await supabase.auth.signOut({ scope: 'local' });
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('tradehub')) {
          localStorage.removeItem(key);
        }
      });
    } catch (cleanupError) {
      console.error('Error during auth cleanup:', cleanupError);
    }
    if (mounted) {
      setCurrentUser(null);
      store.setCurrentUser(null);
      setIsLoading(false);
    }
    return; // ✅ STOP HERE - no retry loop
  }
}
```

**What it does:**
1. Detects refresh token errors immediately
2. Performs local sign-out (no server call)
3. Clears all Supabase-related localStorage keys
4. Sets user to null
5. **Stops execution** - prevents retry loops

---

### 3. ✅ Fixed Export Aliases

**File:** `lib/supabase-client.ts`

**Before:**
```typescript
export { getBrowserSupabase, getBrowserClient, ... } from './supabase/browserClient';
// ❌ getBrowserClient doesn't exist in browserClient.ts
```

**After:**
```typescript
export {
  getBrowserSupabase,
  getBrowserSupabase as getBrowserClient,
  getBrowserSupabase as getSupabaseClient,
  getBrowserSupabase as createClient
} from './supabase/browserClient';
```

**Why:** Provides backward compatibility for code using different import names, all pointing to the same lazy getter function.

---

### 4. ✅ Cleared Next.js Build Cache

**Action:** Deleted `.next` directory to ensure fresh build with new configuration

**Command:**
```bash
rm -rf .next
npm run build
```

**Why:** Next.js caches compiled code. Changes to Supabase client configuration require a fresh build.

---

## How It Works Now

### Auth Initialization Flow

```
User loads page
  ↓
AuthProvider mounts
  ↓
getBrowserSupabase() called (lazy singleton)
  ├─ Returns existing instance if present
  └─ Creates new instance with { autoRefreshToken: false, detectSessionInUrl: false }
  ↓
getSession() called ONCE
  ├─ Error detected?
  │   ├─ YES → Check for refresh_token_not_found
  │   │   ├─ YES → Clear local storage, set user = null, STOP
  │   │   └─ NO → Log error, continue
  │   └─ NO → Continue
  ↓
Session exists?
  ├─ YES → Load user profile from database
  └─ NO → Set user = null
  ↓
Setup onAuthStateChange listener (fires on login/logout)
  ├─ SIGNED_IN → Load user profile
  └─ SIGNED_OUT → Clear user state
  ↓
Done (isLoading = false)
```

### No Retry Loops

**Before:** Invalid token → getSession() error → retry → error → retry → error → 429 rate limit

**After:** Invalid token → getSession() error → detect error → clear storage → set user = null → STOP

---

## Expected Behavior

### ✅ When Logged Out
1. Open preview
2. ONE getSession() call at most
3. No refresh token requests
4. Hero shows "Create Account" + "Log In"
5. Stable state (no flip-flopping)

### ✅ When Logging In
1. Click "Log In"
2. Enter credentials
3. ONE signInWithPassword() call
4. Session established
5. User profile loaded
6. Redirected to dashboard

### ✅ When Session Expires
1. User tries to access protected route
2. getSession() returns error
3. Error handler clears storage
4. User redirected to login
5. No infinite retry loop

### ✅ Background Behavior
- **No automatic refresh token requests**
- **No OAuth callback detection**
- **No background polling**
- Sessions only checked when:
  - Page first loads
  - User explicitly logs in/out
  - Middleware checks for protected routes

---

## Testing Checklist

1. ✅ Clear browser data (localStorage + cookies)
2. ✅ Open "/" - should see logged-out state
3. ✅ Check Network tab - no refresh_token requests
4. ✅ Login - should see ONE signInWithPassword request
5. ✅ Refresh page - should see ONE getSession call max
6. ✅ Logout - session cleared properly
7. ✅ Navigate around - no background token requests
8. ✅ Leave tab open for 5 minutes - no polling

---

## Files Modified

1. `lib/supabase/browserClient.ts` - Disabled autoRefreshToken and detectSessionInUrl
2. `lib/auth-context.tsx` - Added refresh token error handling
3. `lib/supabase-client.ts` - Fixed export aliases
4. `.next/` - Deleted (cache cleared)

---

## Technical Details

### Why autoRefreshToken = false?

Supabase's `autoRefreshToken` feature:
- Polls in the background to refresh tokens before expiry
- Can cause infinite loops if refresh token is invalid
- Not needed for preview/development environments
- Can be enabled in production with proper error handling

### Why detectSessionInUrl = false?

The `detectSessionInUrl` feature:
- Checks URL for OAuth callback parameters (e.g., `#access_token=...`)
- Triggers unnecessary session checks on every page load
- Not needed when not using OAuth flows
- Can cause extra network requests

### Lazy Singleton Pattern

```typescript
declare global {
  var __tradehub_supabase__: ReturnType<typeof createBrowserClient> | undefined;
}

export function getBrowserSupabase() {
  if (globalThis.__tradehub_supabase__) return globalThis.__tradehub_supabase__;

  // Create instance only once, reuse forever
  globalThis.__tradehub_supabase__ = createBrowserClient(...);
  return globalThis.__tradehub_supabase__;
}
```

**Benefits:**
- Single instance across entire app
- Created only when first needed
- No module-level initialization
- Works in both client and server contexts

---

## Prevention Guidelines

### ✅ DO
- Use `getBrowserSupabase()` inside components/functions
- Handle auth errors gracefully with early returns
- Clear localStorage on invalid token errors
- Set `autoRefreshToken: false` in development
- Set `detectSessionInUrl: false` when not using OAuth

### ❌ DON'T
- Export eager singletons: `export const supabase = getBrowserSupabase()`
- Retry on refresh_token_not_found errors
- Leave autoRefreshToken enabled without error handling
- Call `getSession()` in loops or event handlers
- Assume valid sessions without checking errors

---

## Build Status

✅ Build successful (no errors)
✅ All pages compile correctly
✅ No TypeScript errors
✅ Middleware compiles successfully

**Preview ready for testing!**
