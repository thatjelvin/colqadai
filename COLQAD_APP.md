# COLQAD APP SKILL
# Read this file first before doing ANY task on this codebase.
# This tells you exactly what Colqad is, how it works, and how every piece connects.

---

## WHAT IS COLQAD

Colqad is an AI-powered math learning web app for UK university students.
It is NOT a general education tool. It is specifically for university-level mathematics.

The founder (Jelvin) is using himself as a case study — he is both the developer and a user of the app.

### Core learning methods the app implements:
- SM-2 Spaced Repetition — schedules when a student reviews a topic based on how well they knew it
- Retrieval Practice — making students actively recall answers rather than passively read
- Interleaved Practice — mixing different topic types in one session instead of blocking by topic
- Elaborative Interrogation — asking "why" questions to deepen understanding
- Error Analysis — tracking which types of questions a student gets wrong and showing patterns

---

## TECH STACK (memorize this, never assume differently)

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) — NOT Pages Router |
| Language | TypeScript |
| Auth | Clerk (`@clerk/nextjs` v5) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Error monitoring | Sentry (`@sentry/nextjs`) |

### Critical version constraint:
- Next.js is version 14 — NOT 15
- Clerk must be v5 (specifically `@clerk/nextjs@5.7.0`) — v6 and v7 require Next.js 15 and WILL break the build
- Never upgrade Next.js or Clerk without explicit instruction

---

## AUTHENTICATION SYSTEM (Clerk — read carefully)

Supabase Auth has been REMOVED. Clerk handles ALL authentication.
Supabase is used ONLY as a database (queries, inserts, storage).

### How auth works:
1. User signs up or signs in via Clerk (Google OAuth or Email/Password)
2. Clerk issues a JWT and manages the session
3. In server components: `const { userId } = await auth()` from `@clerk/nextjs/server`
4. In client components: `const { user } = useUser()` from `@clerk/nextjs`
5. `userId` from Clerk (format: `user_xxxxxxxxx`) is used to query Supabase

### NEVER do these (these are from old Supabase auth and are wrong):
- `supabase.auth.getUser()`
- `supabase.auth.getSession()`
- `supabase.auth.signInWithOAuth()`
- `session.user.id` from Supabase
- `auth.uid()` in SQL or RLS policies

### The correct Clerk imports:
```typescript
// Server components and API routes
import { auth, currentUser } from '@clerk/nextjs/server'

// Client components
import { useUser, useClerk } from '@clerk/nextjs'

// Middleware
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
```

---

## DATABASE (Supabase — read carefully)

Supabase is the PostgreSQL database. It has NO active RLS policies.
All access control is handled at the application layer using Clerk's userId.

### The Supabase client (database only, no auth):
```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### When querying for a specific user's data:
```typescript
const { userId } = await auth() // Clerk userId
const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('clerk_user_id', userId) // always use clerk_user_id column
```

---

## ENVIRONMENT VARIABLES (required, never remove these)

```
# Supabase (database)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Clerk (auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Rules:
- Variables starting with NEXT_PUBLIC_ are visible in the browser — never put secrets in them
- CLERK_SECRET_KEY must NEVER have NEXT_PUBLIC_ prefix
- Both .env.local (local) and Vercel dashboard (production) must have these

---

## ROUTING & PAGES

| Route | Type | Description |
|---|---|---|
| `/` | Public | Landing/marketing page |
| `/sign-in` | Public | Clerk sign-in UI |
| `/sign-up` | Public | Clerk sign-up UI |
| `/dashboard` | Protected | Main user dashboard |
| `/auth/callback` | DELETED | Was Supabase OAuth callback — no longer exists |

### Protected route rule:
Any route NOT in the public list must redirect to `/sign-in` if user is not authenticated.
Middleware handles this automatically via `clerkMiddleware`.

---

## MIDDLEWARE (critical — this controls all routing)

The middleware must follow this exact pattern:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const { pathname } = request.nextUrl

  if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## USER JOURNEY (what a real user does in the app)

### New user:
1. Lands on `/` (homepage)
2. Clicks "Get started" or "Sign up"
3. Goes to `/sign-up` — Clerk renders the UI automatically
4. Signs up with Google or Email/Password
5. Clerk redirects to `/dashboard`
6. Dashboard checks if user has a profile row in Supabase
7. If no profile → create one automatically using `clerk_user_id`
8. Dashboard loads with empty starting state (no math sessions yet)
9. User selects a math topic to practice
10. App generates questions using SM-2 algorithm
11. User answers questions, app tracks responses
12. Progress saved to Supabase with `clerk_user_id`
13. Next review session scheduled based on SM-2 algorithm

### Returning user:
1. Goes to `/sign-in`
2. Signs in with Google or Email/Password
3. Clerk redirects to `/dashboard`
4. Dashboard loads with their existing progress and scheduled reviews

---

## DEPLOYMENT

- Repository: github.com/thatjelvin/colqadai
- Branch: main (always push to main for production)
- Vercel auto-deploys on every push to main
- Production URL: colqad.tech
- Supabase project ID: zzmsftbiyfltspxppbc

### After any fix, always:
1. Run `npm run build` locally — must pass with zero errors
2. Commit with a clear message
3. Push to main
4. Watch Vercel build logs — fix any deployment errors before stopping

---

## COMMON MISTAKES TO NEVER MAKE

1. Never use Supabase auth methods — Clerk handles all auth
2. Never install @clerk/nextjs above v5 — it breaks with Next.js 14
3. Never put CLERK_SECRET_KEY in a NEXT_PUBLIC_ variable
4. Never delete NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — database still needs them
5. Never remove ClerkProvider from layout.tsx
6. Never leave a page without a loading.tsx and error.tsx — blank screens are not acceptable
7. Never use `auth.uid()` in any SQL or Supabase query — use Clerk's userId
8. Never assume a file exists without checking with `find` or `cat` first
9. Never upgrade Next.js without explicit instruction from Jelvin
10. Never mark a task complete without running `npm run build` first
