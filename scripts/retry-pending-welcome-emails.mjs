#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pipelineSecret = process.env.EMAIL_PIPELINE_SECRET;
const execute = process.argv.includes('--execute');

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function invokeSender(emailEventId) {
  const url = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/send-transactional-email`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    ...(pipelineSecret ? { 'x-internal-email-key': pipelineSecret } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ emailEventId }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function run() {
  const { data, error } = await supabase
    .from('email_events')
    .select('id,to_email,status,created_at')
    .eq('email_type', 'welcome')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load pending welcome events:', error.message);
    process.exit(1);
  }

  const rows = data || [];
  console.log(`Found ${rows.length} pending welcome event(s).`);

  if (!execute) {
    for (const row of rows) {
      console.log(`- ${row.id} | ${row.to_email} | ${row.created_at}`);
    }
    console.log('\nDry run only. Re-run with --execute to send.');
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const result = await invokeSender(row.id);
    if (result.ok) {
      sent += 1;
      console.log(`SENT  ${row.id} -> ${row.to_email}`);
    } else {
      failed += 1;
      const reason = result.body?.error || `HTTP ${result.status}`;
      console.log(`FAIL  ${row.id} -> ${row.to_email} (${reason})`);
    }
  }

  console.log(`\nDone. sent=${sent} failed=${failed} total=${rows.length}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
