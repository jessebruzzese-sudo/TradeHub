# QA Test Accounts Setup

## Overview

This document describes the QA-safe testing mechanism for trade-based tender visibility without unlocking production behavior.

## Implementation Approach: Seed Test Accounts (Option A)

We've implemented Option A - creating seeded test users with fixed primary trades. This is the safest and most production-like approach for QA testing.

## Test Accounts

Eight test accounts are available: four subcontractor accounts with fixed primary trades, three contractor accounts, and one admin account for approval workflows.

### 1. Admin Test Account
- **Email:** test+admin@tradebid.com.au
- **Password:** password
- **Role:** Admin
- **Trust Status:** Verified
- **Purpose:** Tender approval, job management, user verification, and admin workflows

### 2. Contractor Test Accounts

#### Contractor 1 - Build Co Sydney
- **Email:** test+contractor1@tradebid.com.au
- **Password:** password
- **Role:** Contractor
- **Trust Status:** Verified
- **Purpose:** Tender creation workflows

#### Contractor 2 - Premier Constructions
- **Email:** test+contractor2@tradebid.com.au
- **Password:** password
- **Role:** Contractor
- **Trust Status:** Verified
- **Purpose:** Multi-trade tender workflows

#### Contractor 3 - Metro Builders Group
- **Email:** test+contractor3@tradebid.com.au
- **Password:** password
- **Role:** Contractor
- **Trust Status:** Verified
- **Purpose:** Large project tender workflows

### 3. Electrician Test Account
- **Email:** test+electrician@tradebid.com.au
- **Password:** password
- **Primary Trade:** Electrician (locked)
- **Role:** Subcontractor
- **Trust Status:** Verified
- **Subscription:** PRO_10 (Active)

### 3. Plumber Test Account
- **Email:** test+plumber@tradebid.com.au
- **Password:** password
- **Primary Trade:** Plumber (locked)
- **Role:** Subcontractor
- **Trust Status:** Verified
- **Subscription:** PRO_10 (Active)

### 5. Carpenter Test Account
- **Email:** test+carpenter@tradebid.com.au
- **Password:** password
- **Primary Trade:** Carpenter (locked)
- **Role:** Subcontractor
- **Trust Status:** Verified
- **Subscription:** PRO_10 (Active)

### 6. Painter & Decorator Test Account
- **Email:** test+painter@tradebid.com.au
- **Password:** password
- **Primary Trade:** Painter & Decorator (locked)
- **Role:** Subcontractor
- **Trust Status:** Verified
- **Subscription:** PRO_10 (Active)

## Setting Up Test Accounts

### Method 1: Admin Panel (Recommended)

1. Log in as an admin user
2. Navigate to **Admin Dashboard** → **QA Setup**
3. Click the **"Setup Test Accounts"** button
4. The system will create all eight test accounts automatically (1 admin + 3 contractors + 4 subcontractors)
5. If accounts already exist, the system will report them as "already_exists"

### Method 2: Direct Edge Function Call

You can also call the edge function directly:

```bash
curl -X POST \
  "${SUPABASE_URL}/functions/v1/setup-qa-test-accounts" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json"
```

## Testing Workflows

### Admin Workflows

1. **Tender Approval**
   - Log in as test+admin@tradebid.com.au
   - Navigate to Admin Dashboard → Tenders
   - Review and approve pending tenders
   - Test rejection workflow with notes

2. **Job Management**
   - View all jobs across the platform
   - Test job approval workflows
   - Review and manage job lifecycle

3. **User Management**
   - Review user verification requests
   - Test user account management
   - Monitor reliability reviews

### Trade-Based Visibility

1. **Trade-based tender visibility**
   - Log in as the Electrician test account
   - Navigate to the Tenders page
   - Verify you only see tenders that include Electrician in their trade requirements

2. **Trade-specific sub-descriptions**
   - View tender cards as different trade users
   - Verify each user sees their own trade-specific scope description
   - Example: Electrician sees "Install all electrical outlets and lighting fixtures"

3. **Tender detail page behavior**
   - Open a tender that matches your primary trade
   - Verify the detailed scope for your trade is displayed correctly
   - Test the "Express Interest" functionality

4. **Trade-locked behavior**
   - Go to Profile → Edit
   - Attempt to change the primary trade
   - Verify it's locked and cannot be changed (same as production)

### Test Scenario Example

1. **Create a multi-trade tender** (as a Builder/Contractor)
   - Create a tender requiring: Electrician, Plumber, Carpenter
   - Add specific scope descriptions for each trade

2. **Admin approval workflow**
   - Log out and log in as test+admin@tradebid.com.au
   - Navigate to Admin Dashboard → Tenders
   - Review the pending tender
   - Approve the tender to make it visible to subcontractors

3. **Test visibility as Electrician**
   - Log out and log in as test+electrician@tradebid.com.au
   - Go to Tenders page
   - Verify the approved tender appears
   - Verify you see the Electrician-specific scope

4. **Test visibility as Plumber**
   - Log out and log in as test+plumber@tradebid.com.au
   - Go to Tenders page
   - Verify the same tender appears
   - Verify you see the Plumber-specific scope

5. **Test exclusion**
   - Create a tender requiring only Plumber
   - Approve it as admin
   - Log in as test+electrician@tradebid.com.au
   - Verify the tender does NOT appear

## Important Notes

### Production Safety
- These accounts follow the same rules as production users
- Primary trade is locked and cannot be changed
- All RLS policies apply normally
- No special privileges or backdoors

### Account Characteristics
- All accounts have verified trust status for full feature access
- All accounts have active PRO_10 subscriptions
- Clearly marked with "test+" email prefix for easy identification
- Pre-configured with realistic profile data and ratings

### Limitations
- These are real accounts in the database
- DO NOT use these accounts in production environments
- Suitable for staging/development/QA environments only
- Can be reset by deleting and recreating via the admin panel

## Cleanup

If you need to remove the test accounts:

1. Use the Supabase dashboard to delete the users from auth.users
2. The corresponding records in public.users will be cascade-deleted
3. Re-run the setup process to recreate them

Alternatively, you can manually delete from the database:

```sql
-- Delete test accounts
DELETE FROM auth.users
WHERE email IN (
  'test+admin@tradebid.com.au',
  'test+contractor1@tradebid.com.au',
  'test+contractor2@tradebid.com.au',
  'test+contractor3@tradebid.com.au',
  'test+electrician@tradebid.com.au',
  'test+plumber@tradebid.com.au',
  'test+carpenter@tradebid.com.au',
  'test+painter@tradebid.com.au'
);
```

## Technical Implementation

### Components Created

1. **Edge Function:** `setup-qa-test-accounts`
   - Location: `supabase/functions/setup-qa-test-accounts/index.ts`
   - Uses Supabase Admin API to create auth users
   - Creates corresponding public.users records
   - Creates 8 test accounts: 1 admin + 3 contractors + 4 subcontractors
   - Idempotent (safe to run multiple times)

2. **Admin Page:** QA Setup
   - Location: `app/admin/qa-setup/page.tsx`
   - Provides UI for creating test accounts
   - Shows creation results and account details
   - Accessible from Admin Dashboard

### Database Schema

Test accounts use the standard users table schema:

**Admin Account:**
- `role` set to 'admin'
- `trust_status` set to 'verified'
- No trade or subscription fields (admin-specific)

**Contractor Accounts:**
- `role` set to 'contractor'
- `trust_status` set to 'verified'
- `builder_plan` set to 'NONE'
- `builder_sub_status` set to 'NONE'
- `builder_free_trial_tender_used` set to false
- Rating: 4.9
- Completed jobs: 25

**Subcontractor Accounts:**
- `primary_trade` set to specific trade (locked)
- `trust_status` set to 'verified'
- `role` set to 'subcontractor'
- `subcontractor_plan` set to 'PRO_10'
- `subcontractor_sub_status` set to 'ACTIVE'
- Active subscription with 1-year renewal date

## Troubleshooting

### Edge Function Not Found
- Ensure the edge function is deployed to your Supabase project
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured

### Accounts Not Created
- Check edge function logs in Supabase dashboard
- Verify service role key has proper permissions
- Ensure email format is valid

### Cannot Log In
- Verify accounts were created successfully in auth.users
- Check that email confirmation is not required
- Confirm password is exactly: password

## Future Enhancements

If needed, we could add:
- More trade-specific test accounts
- Admin impersonation feature (Option B)
- Development-only override headers (Option C)
- Automated test data creation scripts
