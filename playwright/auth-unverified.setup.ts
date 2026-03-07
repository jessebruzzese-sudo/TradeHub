/**
 * Auth setup for unverified (no ABN) user.
 * Only used when PW_NO_ABN_EMAIL and PW_NO_ABN_PASSWORD are set.
 * Use qa:seed (pw-unverified@tradehub.test) or similar account without ABN.
 */
import { config } from 'dotenv'
import path from 'node:path'
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createChunks, stringToBase64URL } from '@supabase/ssr'

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local') })

const email = process.env.PW_NO_ABN_EMAIL
const password = process.env.PW_NO_ABN_PASSWORD

const BASE64_PREFIX = 'base64-'

function getStorageKey(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  const hostname = new URL(supabaseUrl).hostname
  const projectRef = hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

setup('authenticate unverified user', async ({ page }) => {
  if (!email || !password) {
    throw new Error('PW_NO_ABN_EMAIL and PW_NO_ABN_PASSWORD are required. Run npm run qa:seed (pw-unverified@tradehub.test).')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`Unverified user login failed: ${error.message}. Ensure QA setup has created the account.`)
  }

  const sessionJson = JSON.stringify(data.session)
  const encoded = BASE64_PREFIX + stringToBase64URL(sessionJson)
  const chunks = createChunks(getStorageKey(), encoded)

  const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000'
  const url = new URL(baseURL)
  const domain = url.hostname
  const pathSeg = '/'

  await page.context().addCookies(
    chunks.map((chunk) => ({
      name: chunk.name,
      value: chunk.value,
      domain,
      path: pathSeg,
    }))
  )

  await page.goto(baseURL)
  await page.context().storageState({ path: 'playwright/.auth/unverified-user.json' })
})
