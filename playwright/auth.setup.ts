import { config } from 'dotenv'
import path from 'node:path'
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createChunks, stringToBase64URL } from '@supabase/ssr'

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local') })

function resolvePrimaryAuthCredentials() {
  const allowCustom = process.env.PW_ALLOW_NON_QA_AUTH === '1'
  const envEmail = process.env.PW_EMAIL
  const envPassword = process.env.PW_PASSWORD
  const canonicalEmail = 'pw-free@tradehub.test'
  const canonicalPassword = 'password1'

  if (!envEmail || !envPassword) {
    return {
      email: canonicalEmail,
      password: canonicalPassword,
    }
  }

  const isCanonicalQaFree = envEmail.toLowerCase() === canonicalEmail
  if (allowCustom || isCanonicalQaFree) {
    return { email: envEmail, password: envPassword }
  }

  console.warn(
    `[playwright setup] PW_EMAIL="${envEmail}" is not the canonical QA free account. ` +
      'Using pw-free@tradehub.test for stable ABN/onboarding gating tests. ' +
      'Set PW_ALLOW_NON_QA_AUTH=1 to force custom credentials.'
  )

  return {
    email: canonicalEmail,
    password: canonicalPassword,
  }
}

const { email, password } = resolvePrimaryAuthCredentials()
const BASE64_PREFIX = 'base64-'

// Must match supabase-js default: sb-${projectRef}-auth-token
function getStorageKey(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  const hostname = new URL(supabaseUrl).hostname
  const projectRef = hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

setup('authenticate', async ({ page }) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`Supabase login failed: ${error.message}`)
  }

  const sessionJson = JSON.stringify(data.session)
  const encoded = BASE64_PREFIX + stringToBase64URL(sessionJson)
  const chunks = createChunks(getStorageKey(), encoded)

  const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000'
  const url = new URL(baseURL)
  const domain = url.hostname
  const path = '/'

  await page.context().addCookies(
    chunks.map((chunk) => ({
      name: chunk.name,
      value: chunk.value,
      domain,
      path,
    }))
  )

  await page.goto(baseURL)
  await page.context().storageState({ path: 'playwright/.auth/user.json' })
})
