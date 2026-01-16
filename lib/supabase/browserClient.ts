"use client";
import { createBrowserClient } from "@supabase/ssr";

declare global {
  // eslint-disable-next-line no-var
  var __tradehub_supabase__: ReturnType<typeof createBrowserClient> | undefined;
}

export function getBrowserSupabase() {
  if (globalThis.__tradehub_supabase__) return globalThis.__tradehub_supabase__;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  globalThis.__tradehub_supabase__ = createBrowserClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return globalThis.__tradehub_supabase__;
}
