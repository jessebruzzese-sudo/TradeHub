# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TradeHub is a Next.js 13.5 (App Router) B2B marketplace for Australian contractors/subcontractors. It uses a hosted Supabase instance for auth, database, and storage. No local database setup is required.

### Running the app

- `npm run dev` — starts the Next.js dev server on port 3000
- `.env.local` must exist (copy from `.env.example` if missing). The Supabase URL and anon key in `.env.example` point to the hosted instance and work out of the box.
- Set `NEXT_PUBLIC_ENABLE_BILLING_SIMULATION=true` in `.env.local` to test premium features without Stripe credentials.

### Checks

- `npm run lint` — ESLint (warnings only, no errors expected)
- `npm run typecheck` — TypeScript type checking
- `npm run build` — production build (also runs lint + typecheck)
- `npm run selfcheck` — custom self-check script (`scripts/selfcheck.mjs`)
- No automated test suite exists in this codebase.

### Key caveats

- The project requires **Node.js 20.x** (specified in `package.json` engines). Use `nvm use 20` if needed.
- Stripe, OpenAI, and ABR API keys are optional — the app degrades gracefully without them.
- Signup may show "Error sending confirmation email" if the hosted Supabase instance has email rate limits or restrictions. This is an external service limitation, not a code issue.
- The `@next/swc-wasm-nodejs` package is used instead of native SWC binaries, so builds work without platform-specific binary issues.
