// Browser-only Supabase client with persistent auth.
// Important: storage uploads require an authenticated client so RLS policies pass.
export { getBrowserSupabase } from '@/lib/supabase/browserClient';
