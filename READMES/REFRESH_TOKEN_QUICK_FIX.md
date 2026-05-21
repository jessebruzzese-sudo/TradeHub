# Quick Reference: Refresh Token Loop Fix

## What Was Fixed

1. **Disabled autoRefreshToken** - No more background token refresh attempts
2. **Disabled detectSessionInUrl** - No OAuth callback checks in preview
3. **Added error handling** - Gracefully handles invalid refresh tokens without retry loops
4. **Cleared build cache** - Fresh .next build with new config

## Files Changed

- `lib/supabase/browserClient.ts` - Changed auth config
- `lib/auth-context.tsx` - Added refresh token error handler
- `lib/supabase-client.ts` - Fixed export aliases

## Test It

1. Clear browser storage
2. Open preview
3. Check Network tab - should see NO refresh_token requests
4. Login - should work normally with ONE request
5. Navigate around - no background polling

## Expected Network Behavior

**Before:** 🔴 Infinite POST /auth/v1/token (400 errors)
**After:** ✅ ONE getSession on page load, nothing else

## If Issues Persist

1. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
2. Clear all site data in DevTools
3. Close and reopen preview
4. Check console for "Invalid refresh token detected" warning

---

See SUPABASE_REFRESH_TOKEN_FIX.md for full technical details.
