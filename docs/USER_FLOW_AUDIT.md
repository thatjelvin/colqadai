## 1. Overview

This app now runs on a Supabase-based auth/profile model.

- Authentication/session: Supabase Auth (`@supabase/ssr`)
- User profile + billing metadata: `public.profiles`
- API/server route authorization: Supabase server session checks
- Legacy Prisma runtime removed from app source and replaced with non-Prisma server-side data fallback logic to prevent runtime crashes during stabilization.

## 2. Issues Found

From production logs and code audit:

- Missing `public.profiles` table (`Could not find table public.profiles`)
- Legacy Prisma usage still present in runtime paths, including usage-event lookups (`prisma.usageEvent.findUnique`, `public.UsageEvent does not exist`)
- Hard failure when `SUPABASE_SERVICE_ROLE_KEY` is missing
- Optional profile reads were noisy/failable (`failed to read optional profile`)
- Paddle environment/key mismatch risk (sandbox vs live key)

## 3. Fixes Applied

1. **Profiles table migration script added**
   - Added: `prisma/manual/create_profiles_table.sql`
   - Defines `public.profiles` with required columns:
     - `id uuid primary key references auth.users(id)`
     - `email text`
     - `created_at timestamptz`
   - Includes additional profile/billing columns used by runtime, indexes, and RLS policies.

2. **Auto-create profile after login + safe optional read**
   - Updated: `src/lib/supabase-db-user.ts`
   - Optional profile fetch is non-fatal.
   - If profile row is missing, code upserts a new profile automatically.
   - Any failure to read/create profile logs warning and falls back to safe user defaults.

3. **Prisma runtime removed from app source**
   - Removed Prisma package dependencies from runtime dependency graph.
   - Removed Prisma-specific Next.js externals configuration.
   - Replaced Prisma enum/type imports with local DB types (`src/lib/db-types.ts`).
   - Replaced legacy client file with a server-safe fallback data layer (`src/lib/db.ts`) used by existing API/page logic.
   - Deleted legacy seed script tied to Prisma client.

4. **Usage event billing path no longer uses Prisma**
   - Updated: `src/lib/billing/usage.ts`
   - Replaced Prisma `UsageEvent` read/upsert calls with Supabase `usage_events` reads/upserts.
   - `/api/chat` usage checks now run without querying missing Prisma tables.

5. **Service role key handling hardened**
   - Updated: `src/lib/supabase/admin.ts`
   - Missing `SUPABASE_SERVICE_ROLE_KEY` no longer hard-crashes runtime.
   - Falls back to anon key for non-admin server-side operations and logs warning.

6. **Paddle environment mismatch enforcement**
   - Updated: `src/lib/env.ts`
   - Now throws on invalid combinations:
     - sandbox env + live key
     - production env + sandbox key

## 4. Final User Flow

Validated flow behavior with app running build output and route/API smoke checks:

1. Landing page loads
2. Sign up / login routes available
3. Auth-guarded app routes redirect unauthenticated users to `/login` (expected)
4. After auth, app layout resolves user via Supabase and profile fallback
5. Core nav routes are available in app shell:
   - `/dashboard`
   - `/chat`
   - `/topics`
   - `/settings`
   - `/pricing`
6. Logout handled via Supabase client sign-out in sidebar

## 5. System Behavior

- No runtime dependency on Prisma client remains in `src`.
- Profile read failures are non-fatal.
- Missing profile rows are auto-created.
- Missing service role key no longer crashes server paths.
- Billing usage limiter path no longer calls missing `UsageEvent` table.
- Build, lint, and tests pass in this environment with required env vars provided for build.

## 6. Remaining Risks (if any)

- Usage enforcement now depends on the `public.usage_events` table being created from the SQL script; until deployed, usage checks degrade gracefully.
- The SQL migration/script must be applied to production Supabase before relying on profile persistence.
- Full end-to-end authenticated UX still depends on valid deployed Supabase credentials and live auth callback configuration.
