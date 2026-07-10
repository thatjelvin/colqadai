# Colqad Health Check — Fixes TODO

> Generated 2026-07-09. Each item is pre-approved for implementation.
> In a new session, reference this file and pick up where we left off.

---

## 🔴 Broken (App-breaking)

### 1. Add missing env vars to `.env.local`
- **Add** `GROQ_API_KEY` (required — all AI features crash without it)
- **Add** `SUPABASE_SERVICE_ROLE_KEY` (required — profile writes/onboarding/billing fail without it)
- Get both from their respective dashboards (Groq console, Supabase Settings > API)

### 2. Fix Paddle env key mismatch in `.env.local`
- `.env.local` has `PADDLE_ENVIRONMENT="sandbox"` but `PADDLE_API_KEY="pdl_live_apikey_..."` (a live key)
- `src/lib/env.ts:66-69` throws on this combination at startup
- **Fix**: Either remove `PADDLE_API_KEY` from `.env.local` (it's optional in the schema), or set `PADDLE_ENVIRONMENT="production"`, or replace with a real sandbox key

---

## 🟡 Needs Attention

### 3. Fix `gradeAnswer()` silent failure in `src/lib/learning/aiClassifiers.ts`
- Lines 58-63: bare `catch {}` returns `{ isCorrect: false }` on any Groq error
- A Groq outage marks ALL student answers incorrect with a misleading message
- **Fix**: Either throw and surface the error to the caller, or return a `GRADING_UNAVAILABLE` state that the UI can display as "grading temporarily unavailable, try again"

### 4. Add try/catch to chapter summary generation in `src/app/explore/[slug]/page.tsx`
- `generateSummaryWithGroq()` throws on HTTP errors with no catch at the call site
- A Groq failure crashes the entire topic summary page
- **Fix**: Wrap the call in try/catch, return a user-friendly error state ("Summary unavailable, try again later")

### 5. Switch chapter summary from raw `fetch()` to shared Groq client
- `generateSummaryWithGroq()` calls `https://api.groq.com/openai/v1/chat/completions` via raw `fetch()`
- All other consumers use `src/lib/groq.ts` shared client
- **Fix**: Refactor to use `import { groq } from "@/lib/groq"` for consistency

### 6. Clean up dead env vars in `.env.local`
- Remove `GOOGLE_CLIENT_ID` — no code references
- Remove `GOOGLE_CLIENT_SECRET` — no code references
- Remove `GEMINI_API_KEY` — no code references (app uses Groq, not Gemini)

### 7. Delete legacy `src/lib/supabaseClient.ts`
- Dead code — uses `createBrowserClient` without proper SSR cookie adapter
- Not imported anywhere in the codebase
- Confusing for future devs who might use it by mistake

### 8. Remove verbose `console.log` from auth pages
- 13 debug log statements across 3 files:
  - `src/app/(auth)/login/page.tsx` (3 logs)
  - `src/app/(auth)/register/page.tsx` (5 logs)
  - `src/app/auth/callback/route.ts` (5 logs)
- These log `[OAuth] CALLBACK REACHED`, origin URLs, env var presence, etc.
- **Fix**: Remove all or gate behind a `NODE_ENV === "development"` check

### 9. Regenerate Prisma schema
- `prisma/schema.prisma` still declares `passwordHash String?` on User model (line 18)
- This column was dropped in migration `20260414221000_supabase_auth_cutover`
- **Fix**: Run `npx prisma db pull` then `npx prisma generate`

### 10. Re-enable ESLint and TypeScript in build (`next.config.mjs`)
- Currently `eslint: { ignoreDuringBuilds: true }` and `typescript: { ignoreBuildErrors: true }`
- Masks real errors during deployment
- **Fix**: Set both to `false` after fixing any lint/type errors (do this last)

---

## 🟢 Verified Clean (No action needed)

- ✅ Clerk migration — zero references found across entire codebase
- ✅ NextAuth references — zero found; old tables properly dropped
- ✅ Supabase client setup — three clients (browser, server, admin) properly separated
- ✅ Middleware auth guard — session check on every request, correct public paths
- ✅ Login/Register flows — Supabase Auth with email + Google OAuth
- ✅ OAuth callback — code exchange, email verification, redirect
- ✅ Onboarding flow — server auth check + client wizard
- ✅ RLS policies — all user-scoped tables use `auth.uid() = user_id` correctly
- ✅ Knowledge-gap diagnostics — pure data-driven, no AI dependency
- ✅ Notebook processing — purely algorithmic
- ✅ Colly assistant — intent classification + conversational, properly structured
- ✅ Chat streaming — works with title generation fallback
- ✅ Tutor help — clean error handling
- ✅ `profiles` table RLS — policies exist in `prisma/manual/create_profiles_table.sql`

---

## ⏳ Pending (Couldn't verify yet)

- **Build output** — `npm install` was running at time of report; `next build` not yet run
- **Dev server runtime** — start `next dev` and check for console errors, hydration warnings, broken routes
- **Supabase post-resume connectivity** — verify pooler accepts connections (run `SELECT 1` in SQL Editor)
- **Live Groq API key validation** — test with a simple API call once key is added
- **End-to-end auth flow test** — sign up → email confirm → onboarding → dashboard

---

## 📋 Suggested Implementation Order

1. Items 1-2 (env vars) — unlocks everything else
2. Items 6-7 (dead code cleanup) — quick wins
3. Items 3-5 (Groq error handling) — highest product risk
4. Item 8 (console.log cleanup)
5. Item 9 (Prisma regen)
6. Item 10 (re-enable build checks) — do last
7. Run full build + dev server + end-to-end test after all fixes
