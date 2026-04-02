/**
 * Enable Premium for a TradeHub user via Supabase service role.
 * Run: node scripts/enable-premium-user.mjs
 *   Or: PW_PREMIUM_EMAIL=test5@gmail.com node scripts/enable-premium-user.mjs
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch (e) {
  console.warn('Could not load .env.local:', e.message);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.PW_PREMIUM_EMAIL || process.argv[2] || null;
const fallbackUserId = 'e1c4fb02-43cc-456c-a819-b53b1f2775af';

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const now = new Date();
const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

async function main() {
  let userId = fallbackUserId;
  if (email) {
    const { data: user, error: findErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (findErr || !user) {
      console.error('User not found for email:', email, findErr?.message || '');
      process.exit(1);
    }
    userId = user.id;
    console.log('Found user:', email, '->', userId);
  }

  const update = {
    plan: 'premium',
    subscription_status: 'ACTIVE',
    subscription_started_at: now.toISOString(),
    subscription_renews_at: in30Days.toISOString(),
  };

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', userId)
    .select('id, email, role, plan, subscription_status, complimentary_premium_until, subscription_started_at, subscription_renews_at')
    .single();

  if (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }

  console.log('Premium enabled successfully.\nVerification:');
  console.log(JSON.stringify(data, null, 2));
}

main();
