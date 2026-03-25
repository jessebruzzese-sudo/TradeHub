#!/usr/bin/env node
/**
 * TradeHub Playwright QA Seed Script
 *
 * Creates deterministic QA records for E2E tests. Run before Playwright suite.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Seed records (TradeHub naming):
 * - pw-free@tradehub.test (verified free user) — PW_EMAIL
 * - pw-premium@tradehub.test (verified premium user) — PW_PREMIUM_EMAIL
 * - pw-unverified@tradehub.test (unverified, no ABN) — PW_NO_ABN_EMAIL
 * - pw-other@tradehub.test (verified, for non-owned jobs)
 * - Jobs: owned open, non-owned open, owned with attachment
 * - Public profiles (2+), one verified
 *
 * Output: playwright/seed-ids.json with IDs for tests
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const PASSWORD = 'password1';
const NOW = new Date().toISOString();
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const IN_3_DAYS = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

// Sydney coords for jobs (get_jobs_visible_to_viewer uses location)
const SYDNEY_LAT = -33.8688;
const SYDNEY_LNG = 151.2093;

const SEED_USERS = [
  {
    email: 'pw-free@tradehub.test',
    name: 'QA Free User',
    role: 'contractor',
    primary_trade: 'Electrical',
    abn: '12345678901',
    abn_status: 'VERIFIED',
    is_public_profile: true,
    base_lat: SYDNEY_LAT,
    base_lng: SYDNEY_LNG,
    location: 'Sydney',
    postcode: '2000',
    builder_plan: 'NONE',
    builder_sub_status: 'NONE',
    is_premium: false,
  },
  {
    email: 'pw-premium@tradehub.test',
    name: 'QA Premium User',
    role: 'contractor',
    primary_trade: 'Plumbing',
    abn: '12345678902',
    abn_status: 'VERIFIED',
    is_public_profile: true,
    base_lat: SYDNEY_LAT,
    base_lng: SYDNEY_LNG,
    location: 'Sydney',
    postcode: '2000',
    builder_plan: 'PREMIUM',
    builder_sub_status: 'ACTIVE',
    is_premium: true,
  },
  {
    email: 'pw-unverified@tradehub.test',
    name: 'QA Unverified User',
    role: 'contractor',
    primary_trade: 'Carpentry',
    abn: null,
    abn_status: null,
    is_public_profile: true,
    base_lat: SYDNEY_LAT,
    base_lng: SYDNEY_LNG,
    location: 'Sydney',
    postcode: '2000',
    builder_plan: 'NONE',
    builder_sub_status: 'NONE',
  },
  {
    email: 'pw-other@tradehub.test',
    name: 'QA Other User',
    role: 'contractor',
    primary_trade: 'Electrical',
    abn: '12345678903',
    abn_status: 'VERIFIED',
    is_public_profile: true,
    base_lat: SYDNEY_LAT,
    base_lng: SYDNEY_LNG,
    location: 'Sydney',
    postcode: '2000',
    builder_plan: 'NONE',
    builder_sub_status: 'NONE',
  },
  {
    email: 'pw-admin@tradehub.test',
    name: 'QA Admin User',
    role: 'admin',
    primary_trade: null,
    abn: '12345678904',
    abn_status: 'VERIFIED',
    is_public_profile: true,
    base_lat: SYDNEY_LAT,
    base_lng: SYDNEY_LNG,
    location: 'Sydney',
    postcode: '2000',
    builder_plan: 'NONE',
    builder_sub_status: 'NONE',
    is_premium: true,
  },
  {
    email: 'pw-plastering@tradehub.test',
    name: 'QA Plastering User',
    role: 'contractor',
    primary_trade: 'Plastering / Gyprock',
    abn: '12345678905',
    abn_status: 'VERIFIED',
    is_public_profile: true,
    base_lat: SYDNEY_LAT,
    base_lng: SYDNEY_LNG,
    location: 'Sydney',
    postcode: '2000',
    builder_plan: 'NONE',
    builder_sub_status: 'NONE',
    is_premium: false,
  },
];

async function ensureUser(acc) {
  const tradeList = acc.primary_trade ? [acc.primary_trade] : [];
  const userMetadata = {
    name: acc.name,
    role: acc.role,
    primaryTrade: acc.primary_trade ?? null,
    primary_trade: acc.primary_trade ?? null,
    trade_categories: tradeList,
    trades: tradeList,
    abn: acc.abn ?? null,
    abn_status: acc.abn_status ?? null,
    abnVerified: acc.abn_status === 'VERIFIED',
    location: acc.location ?? null,
    postcode: acc.postcode ?? null,
    locationLat: acc.base_lat ?? null,
    locationLng: acc.base_lng ?? null,
    location_lat: acc.base_lat ?? null,
    location_lng: acc.base_lng ?? null,
  };

  const { data: users } = await admin.auth.admin.listUsers();
  let authUser = users?.users?.find((u) => u.email === acc.email);
  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    if (error) throw error;
    authUser = data.user;
  } else {
    await admin.auth.admin.updateUserById(authUser.id, {
      password: PASSWORD,
      user_metadata: userMetadata,
    });
  }
  const userId = authUser.id;
  const abnVerifiedAt = acc.abn_status === 'VERIFIED' && acc.abn ? NOW : null;
  const { error } = await admin.from('users').upsert(
    {
      id: userId,
      email: acc.email,
      name: acc.name,
      role: acc.role,
      primary_trade: acc.primary_trade ?? null,
      abn: acc.abn,
      abn_status: acc.abn_status,
      abn_verified_at: abnVerifiedAt,
      is_public_profile: acc.is_public_profile ?? true,
      base_lat: acc.base_lat,
      base_lng: acc.base_lng,
      location: acc.location,
      postcode: acc.postcode,
      builder_plan: acc.builder_plan ?? 'NONE',
      builder_sub_status: acc.builder_sub_status ?? 'NONE',
      is_premium: acc.is_premium ?? false,
      trust_status: 'verified',
      rating: 4.8,
      completed_jobs: 10,
      member_since: NOW,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;

  return userId;
}

async function main() {
  const ids = { users: {}, jobs: {} };

  console.log('Seeding QA users...');
  for (const u of SEED_USERS) {
    ids.users[u.email] = await ensureUser(u);
  }
  const freeId = ids.users['pw-free@tradehub.test'];
  const otherId = ids.users['pw-other@tradehub.test'];

  // Jobs: owned by free, non-owned by other (delete existing QA jobs first for idempotency)
  console.log('Seeding QA jobs...');
  const { error: delJobs } = await admin.from('jobs').delete().ilike('title', '[QA]%');
  if (delJobs) console.warn('Could not delete existing QA jobs:', delJobs.message);
  const ownedJob = {
    id: randomUUID(),
    contractor_id: freeId,
    title: '[QA] Owned Open Job',
    description: 'Deterministic QA seed job for owner-permissions tests.',
    trade_category: 'Electrical',
    location: 'Sydney',
    postcode: '2000',
    location_lat: SYDNEY_LAT,
    location_lng: SYDNEY_LNG,
    dates: [TOMORROW],
    start_time: '08:00',
    duration: 1,
    pay_type: 'fixed',
    rate: 500,
    status: 'open',
    attachments: null,
  };
  const { data: job1 } = await admin.from('jobs').insert(ownedJob).select('id').single();
  if (job1) ids.jobs.ownedOpen = job1.id;

  const nonOwnedJob = {
    id: randomUUID(),
    contractor_id: otherId,
    title: '[QA] Non-Owned Open Job',
    description: 'Deterministic QA seed job for non-owner tests.',
    trade_category: 'Electrical',
    location: 'Sydney',
    postcode: '2000',
    location_lat: SYDNEY_LAT,
    location_lng: SYDNEY_LNG,
    dates: [TOMORROW],
    start_time: '09:00',
    duration: 2,
    pay_type: 'hourly',
    rate: 85,
    status: 'open',
    attachments: null,
  };
  const { data: job2 } = await admin.from('jobs').insert(nonOwnedJob).select('id').single();
  if (job2) ids.jobs.nonOwnedOpen = job2.id;

  const jobWithAttachment = {
    id: randomUUID(),
    contractor_id: freeId,
    title: '[QA] Job With Attachment',
    description: 'QA seed job with image attachment for attachment tests.',
    trade_category: 'Plumbing',
    location: 'Sydney',
    postcode: '2000',
    location_lat: SYDNEY_LAT,
    location_lng: SYDNEY_LNG,
    dates: [TOMORROW],
    start_time: '08:00',
    duration: 1,
    pay_type: 'fixed',
    rate: 600,
    status: 'open',
    attachments: [{ bucket: 'job-attachments', path: `qa-seed/${freeId}/qa-attach.png`, name: 'qa-attach.png', type: 'image/png' }],
  };
  const { data: job3 } = await admin.from('jobs').insert(jobWithAttachment).select('id').single();
  if (job3) ids.jobs.withAttachment = job3.id;

  // Clear subcontractor_availability for QA users so "No availability" tests are deterministic
  const qaUserIds = Object.values(ids.users);
  if (qaUserIds.length > 0) {
    const { error: delAvail } = await admin
      .from('subcontractor_availability')
      .delete()
      .in('user_id', qaUserIds);
    if (delAvail) console.warn('Could not clear QA availability:', delAvail.message);
    else console.log('Cleared subcontractor_availability for QA users');
  }

  const outPath = 'playwright/seed-ids.json';
  writeFileSync(outPath, JSON.stringify(ids, null, 2));
  console.log(`Wrote ${outPath}`);

  console.log('\nQA Seed complete. Run: npm run qa:e2e');
  console.log('  PW_EMAIL=pw-free@tradehub.test');
  console.log('  PW_PASSWORD=password1');
  console.log('  PW_PREMIUM_EMAIL=pw-premium@tradehub.test');
  console.log('  PW_PREMIUM_PASSWORD=password1');
  console.log('  PW_NO_ABN_EMAIL=pw-unverified@tradehub.test');
  console.log('  PW_NO_ABN_PASSWORD=password1');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
