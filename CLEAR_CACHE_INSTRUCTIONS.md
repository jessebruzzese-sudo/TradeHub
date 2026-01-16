# 🔥 EMERGENCY FIX: Clear Cached JavaScript

## The Problem

Your browser is still running the OLD JavaScript code with the infinite refresh token loop. The new code has been deployed, but your browser cached the old bundle.

---

## ✅ STEP-BY-STEP FIX

### **Step 1: Clear ALL Browser Storage**

1. Open DevTools (press **F12**)
2. Click the **Application** tab (or **Storage** in Firefox)
3. In the left sidebar, find **Storage** section
4. Click **"Clear site data"** button
5. Make sure ALL boxes are checked:
   - ✅ Cookies and site data
   - ✅ Cached images and files
   - ✅ Local and session storage
6. Click **"Clear site data"** button
7. Close DevTools

### **Step 2: Hard Refresh**

Do NOT use regular refresh (F5). You MUST use:

- **Mac:** `Cmd + Shift + R`
- **Windows:** `Ctrl + Shift + F5`
- **Linux:** `Ctrl + Shift + R`

Or:

- Hold `Shift` and click the refresh button

### **Step 3: Verify New Code Is Running**

Open the Console (F12 → Console tab) and look for:

✅ **GOOD SIGNS:**
```
[Auth] State change: INITIAL_SESSION
```

❌ **BAD SIGNS:**
```
POST https://...supabase.co/auth/v1/token
429 (Too Many Requests)
```

---

## 🚨 IF STILL NOT WORKING

### **Option A: Nuclear Option (Fastest)**

1. Open Console (F12)
2. Paste this and press Enter:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload(true);
   ```

### **Option B: Close and Restart Browser**

1. Close ALL browser tabs/windows completely
2. Reopen browser
3. Navigate to preview URL

### **Option C: Use Incognito/Private Window**

1. Open new Incognito/Private window
2. Navigate to preview URL
3. Should work immediately (no cached JS)

---

## 📊 How to Verify It's Fixed

### **Network Tab - Should See:**

✅ **ONE** `POST /auth/v1/session` request on page load
✅ **ZERO** `POST /auth/v1/token?grant_type=refresh_token` requests
✅ No 429 errors
✅ No infinite requests

### **Console - Should See:**

✅ `[Auth] State change: INITIAL_SESSION` (or similar)
✅ No refresh token errors
✅ Smooth loading

### **Page Behavior:**

✅ Hero page loads immediately
✅ Shows "Create Account" + "Log In" buttons
✅ No flickering or state changes
✅ Stays stable (doesn't reload)

---

## 🔍 Debug: Check Which Code Is Running

Paste this in Console:

```javascript
// Check Supabase config
const supabase = window.globalThis.__tradehub_supabase__;
console.log('autoRefreshToken:', supabase?.auth?.autoRefreshToken);
console.log('detectSessionInUrl:', supabase?.auth?.detectSessionInUrl);
```

**Expected output:**
```
autoRefreshToken: false  ✅
detectSessionInUrl: false ✅
```

If you see `true` for either, the old code is still cached.

---

## 💡 Why This Happens

1. **Browser caching** - Browsers aggressively cache JavaScript files
2. **Service workers** - May cache old code
3. **Hot module replacement** - Preview might not have restarted
4. **Multiple tabs** - Other tabs may be running old code

---

## ⚡ Fastest Fix (Copy-Paste)

```javascript
// Open Console (F12) and paste this:
localStorage.clear();
sessionStorage.clear();
caches.keys().then(names => names.forEach(name => caches.delete(name)));
location.reload(true);
```

This will:
- Clear local storage
- Clear session storage
- Clear cache storage
- Force hard reload

---

## 🎯 Expected Result

**Before:**
- 🔴 Console spammed with errors
- 🔴 Network tab showing 100+ requests
- 🔴 429 rate limit errors
- 🔴 Page unstable

**After:**
- ✅ Console clean (maybe one log: `[Auth] State change: ...`)
- ✅ Network tab shows 1-3 requests max
- ✅ No errors
- ✅ Page stable and fast

---

## 🆘 Still Having Issues?

If after trying ALL steps above it's still broken:

1. Check if preview server restarted (close and reopen preview)
2. Try different browser
3. Check if VPN/proxy is caching
4. Screenshot the Network tab and Console for debugging
