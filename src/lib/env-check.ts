export function assertEnv() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env: ${key}`)
    }
  }
}
