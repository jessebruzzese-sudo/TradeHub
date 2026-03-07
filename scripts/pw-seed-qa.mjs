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
 * - pw-other@tradehub.test (verified, for non-owned jobs/tenders)
 * - Jobs: owned open, non-owned open, owned with attachment
 * - Tenders: owned draft, owned live, non-owned
 * - Public profiles (2+), one verified
 *
 * Output: playwright/seed-ids.json with IDs for tests
 */
import 'dotenv/config';
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
];

async function ensureUser(acc) {
  const { data: users } = await admin.auth.admin.listUsers();
  let authUser = users?.users?.find((u) => u.email === acc.email);
  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    authUser = data.user;
  } else {
    await admin.auth.admin.updateUserById(authUser.id, { password: PASSWORD });
  }
  const userId = authUser.id;
  const { error } = await admin.from('users').upsert(
    {
      id: userId,
      email: acc.email,
      name: acc.name,
      role: acc.role,
      primary_trade: acc.primary_trade,
      abn: acc.abn,
      abn_status: acc.abn_status,
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
  const ids = { users: {}, jobs: {}, tenders: {} };

  console.log('Seeding QA users...');
  for (const u of SEED_USERS) {
    ids.users[u.email] = await ensureUser(u);
  }
  const freeId = ids.users['pw-free@tradehub.test'];
  const otherId = ids.users['pw-other@tradehub.test'];
  const unverifiedId = ids.users['pw-unverified@tradehub.test'];

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

  // Tenders: owned draft, owned live, non-owned (delete existing QA tenders first)
  console.log('Seeding QA tenders...');
  const { error: delTenders } = await admin.from('tenders').delete().ilike('project_name', '[QA]%');
  if (delTenders) console.warn('Could not delete existing QA tenders:', delTenders.message);
  const ownedDraft = {
    builder_id: freeId,
    project_name: '[QA] Owned Draft Tender',
    project_description: 'Deterministic QA draft for owner tests.',
    suburb: 'Sydney',
    postcode: '2000',
    lat: SYDNEY_LAT,
    lng: SYDNEY_LNG,
    status: 'DRAFT',
    tier: 'FREE_TRIAL',
    budget_min_cents: 50000,
    budget_max_cents: 100000,
    desired_start_date: TOMORROW,
    desired_end_date: IN_3_DAYS,
  };
  const { data: t1 } = await admin.from('tenders').insert(ownedDraft).select('id').single();
  if (t1) {
    ids.tenders.ownedDraft = t1.id;
    await admin.from('tender_trade_requirements').upsert(
      { tender_id: t1.id, trade: 'Electrical', sub_description: '' },
      { onConflict: 'tender_id,trade' }
    );
  }

  const ownedLive = {
    builder_id: freeId,
    project_name: '[QA] Owned Live Tender',
    project_description: 'Deterministic QA live tender.',
    suburb: 'Sydney',
    postcode: '2000',
    lat: SYDNEY_LAT,
    lng: SYDNEY_LNG,
    status: 'LIVE',
    tier: 'FREE_TRIAL',
    budget_min_cents: 60000,
    budget_max_cents: 120000,
    desired_start_date: TOMORROW,
    desired_end_date: IN_3_DAYS,
  };
  const { data: t2 } = await admin.from('tenders').insert(ownedLive).select('id').single();
  if (t2) {
    ids.tenders.ownedLive = t2.id;
    await admin.from('tender_trade_requirements').upsert(
      { tender_id: t2.id, trade: 'Plumbing', sub_description: '' },
      { onConflict: 'tender_id,trade' }
    );
    // Tender with document attachment for attachment tests
    await admin.from('tender_documents').insert({
      tender_id: t2.id,
      file_name: 'qa-spec.pdf',
      file_url: 'https://example.com/qa-spec.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024,
      trade: null,
    });
  }

  const nonOwnedTender = {
    builder_id: otherId,
    project_name: '[QA] Non-Owned Tender',
    project_description: 'Deterministic QA tender from other builder.',
    suburb: 'Sydney',
    postcode: '2000',
    lat: SYDNEY_LAT,
    lng: SYDNEY_LNG,
    status: 'LIVE',
    tier: 'FREE_TRIAL',
    budget_min_cents: 70000,
    budget_max_cents: 140000,
    desired_start_date: TOMORROW,
    desired_end_date: IN_3_DAYS,
  };
  const { data: t3 } = await admin.from('tenders').insert(nonOwnedTender).select('id').single();
  if (t3) {
    ids.tenders.nonOwned = t3.id;
    await admin.from('tender_trade_requirements').upsert(
      { tender_id: t3.id, trade: 'Electrical', sub_description: '' },
      { onConflict: 'tender_id,trade' }
    );
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
