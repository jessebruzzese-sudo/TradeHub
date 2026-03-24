/**
 * Server Supabase clients (App Router).
 * Async factories match common `await createServerSupabase()` call sites.
 *
 * - `createServerSupabase` — user session (cookies); use for `auth.getUser()` etc.
 * - `createServiceSupabase` — service role; required for RPCs granted only to service_role
 *   (e.g. `refresh_profile_strength`, `calculate_profile_strength`).
 */
import {
  createServerSupabase as createServerSupabaseSync,
  createServiceSupabase as createServiceSupabaseSync,
} from '../supabase-server';

export async function createServerSupabase() {
  return createServerSupabaseSync();
}

export async function createServiceSupabase() {
  return createServiceSupabaseSync();
}
