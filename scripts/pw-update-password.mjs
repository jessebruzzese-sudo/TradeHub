#!/usr/bin/env node
/**
 * Update password for a user via Supabase Admin API.
 * Usage: node scripts/pw-update-password.mjs [email] [newPassword]
 * Or with env: PW_EMAIL=test2@gmail.com PW_NEW_PASSWORD=password1 node scripts/pw-update-password.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const email = process.argv[2] || process.env.PW_EMAIL;
const newPassword = process.argv[3] || process.env.PW_NEW_PASSWORD;

if (!email || !newPassword) {
  console.error('Usage: node scripts/pw-update-password.mjs <email> <newPassword>');
  console.error('   Or: PW_EMAIL=... PW_NEW_PASSWORD=... node scripts/pw-update-password.mjs');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

async function main() {
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error('List users failed:', listError.message);
    process.exit(1);
  }

  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (updateError) {
    console.error('Update password failed:', updateError.message);
    process.exit(1);
  }

  console.log(`Password updated for ${email}`);
}

main();
