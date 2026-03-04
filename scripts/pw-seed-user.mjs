import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const email = process.env.PW_E2E_EMAIL || `pw+${Date.now()}@tradehub.test`;
const password = process.env.PW_E2E_PASSWORD || crypto.randomBytes(10).toString('hex');

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) throw error;

console.log(JSON.stringify({ userId: data.user.id, email, password }, null, 2));
