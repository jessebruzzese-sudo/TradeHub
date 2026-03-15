# Supabase Auth Email via Resend SMTP

## Purpose

Configure Supabase Auth emails to send through Resend SMTP so authentication emails (signup confirmation, password reset, magic link, and email change) are sent as:

- Sender name: `TradeHub`
- Sender email: `hello@tradehub.com.au`

This is separate from TradeHub transactional emails already sent by the `send-transactional-email` Edge Function.

## Why Not Gmail SMTP

- Gmail SMTP often has stricter sending limits and anti-spam throttling for app-style transactional auth traffic.
- DMARC/SPF/DKIM alignment is cleaner when auth emails are sent from your verified domain mail provider.
- Resend gives a domain-focused mail setup aligned with the existing TradeHub email stack.

## Current Codebase Audit (Auth Email Triggers)

- **Signup trigger exists:** `src/lib/auth-context.tsx` uses `supabase.auth.signUp(...)`.
- **Password reset trigger missing:** no usage of `supabase.auth.resetPasswordForEmail(...)`.
- **Magic link trigger missing:** no usage of `supabase.auth.signInWithOtp(...)`.
- **Admin link generation missing:** no usage of `supabase.auth.admin.generateLink(...)`.
- **No explicit auth email redirect args in code:** no `emailRedirectTo` / `redirectTo` passed to auth email APIs.
- **No auth callback/confirm route found in app router:** no `/auth/callback`, `confirm`, or `update-password` route currently exists.

## Supabase SMTP Settings (Dashboard Values)

Go to: **Supabase Dashboard -> Authentication -> Emails -> SMTP Settings**

Use:

- **Enable custom SMTP:** `ON`
- **Sender email:** `hello@tradehub.com.au`
- **Sender name:** `TradeHub`
- **Host:** `smtp.resend.com`
- **Port:** `587`
- **Username:** `resend`
- **Password:** `RESEND_API_KEY` value
- **Minimum interval per user:** `60` seconds

Secret handling:

- Do not paste secrets into source files.
- Keep key in secret manager/environment:
  - `RESEND_API_KEY=your_resend_api_key_here`

## Required Supabase Auth URL Settings

Go to: **Supabase Dashboard -> Authentication -> URL Configuration**

Set:

- **Site URL (production):** `https://tradehub.com.au` (or your canonical production origin)
- **Additional Redirect URLs:**
  - `https://tradehub.com.au/**`
  - `https://www.tradehub.com.au/**`
  - `http://localhost:3000/**` (local dev only)

If you have a staging domain, add it explicitly, for example:

- `https://staging.tradehub.com.au/**`

## Environment References In Repo

Present today:

- `NEXT_PUBLIC_SUPABASE_URL` (in `.env`, `.env.local`, `.env.example`)
- `SUPABASE_URL` (in `.env.local`)
- `NEXT_PUBLIC_SITE_URL` (in `.env.local`)
- `NEXT_PUBLIC_APP_URL` (in `.env.local`, `.env.example`)
- `SITE_URL` referenced in code fallback logic (`src/lib/stripe.ts`, `src/lib/alerts/listing-email-templates.ts`)
- `RESEND_API_KEY` documented in `.env.example` and used by transactional mail flow

Not present:

- `supabase/config.toml` (no committed local auth mailer config file)
- SMTP-specific Supabase auth config in repo files

Recommended env conventions:

- **Production**
  - `NEXT_PUBLIC_APP_URL=https://tradehub.com.au`
  - `NEXT_PUBLIC_SITE_URL=https://tradehub.com.au`
  - `SITE_URL=https://tradehub.com.au`
- **Local**
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
  - `SITE_URL=http://localhost:3000`

## Redirect Flow Validation Notes

- Signup emails are initiated by Supabase Auth (via `signUp`) and currently rely on Supabase dashboard URL settings because no explicit `emailRedirectTo` is provided.
- No hardcoded localhost-only redirect was found in auth email API calls (because redirect args are not set in code).
- The app currently has a `forgot-password` UI page, but it does not call `supabase.auth.resetPasswordForEmail`, and there is no dedicated auth callback/update-password handler route yet.

## Test Plan

### A) Signup Confirmation Email

1. Ensure custom SMTP is enabled with Resend values above.
2. In Supabase Auth settings, ensure email confirmations are enabled (if required by your policy).
3. Create a new user from `/signup`.
4. Verify email arrives from `TradeHub <hello@tradehub.com.au>`.
5. Open link and confirm it lands on a valid TradeHub URL from configured redirect list.

### B) Password Reset Email

Current status: app flow is incomplete (UI exists but API call/handler route missing).

To validate once wired:

1. Trigger `supabase.auth.resetPasswordForEmail(email, { redirectTo: "<app reset URL>" })`.
2. Verify email sender is `TradeHub <hello@tradehub.com.au>`.
3. Open link and ensure user lands on reset/update password page.
4. Complete password change and confirm login works with new password.

## Common Failure Cases and Fixes

- **No auth email delivered**
  - Check custom SMTP is enabled and `RESEND_API_KEY` is valid.
  - Confirm sender domain DNS (SPF/DKIM/DMARC) remains healthy in Resend.
- **Supabase sends with default sender**
  - Custom SMTP is disabled or misconfigured in Dashboard.
- **Redirect error / invalid redirect URL**
  - Add exact domain/pattern to Supabase Additional Redirect URLs.
- **Links land on localhost in production**
  - Fix Supabase Site URL and remove incorrect production dashboard values.
- **Password reset appears broken**
  - Expected with current code until reset email trigger + update-password flow are implemented.

## Readiness Summary

- Ready to switch Supabase Auth mail transport to Resend SMTP at dashboard level.
- No app code change is required for SMTP transport switch itself.
- For complete auth email UX coverage, password reset and callback/update-password routes still need implementation.
