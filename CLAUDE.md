# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**COLQAD** is an AI-powered math learning web app for university STEM students. It implements spaced repetition (SM-2 algorithm), retrieval practice, interleaved practice, and AI-driven error analysis. Students solve LaTeX-rendered math problems, receive AI tutoring via Groq LLM, and progress through mastery levels.

## Development Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build (TypeScript + ESLint + Next.js build)
npm run lint         # ESLint
npm run test         # Jest tests
npx jest <path>      # Run a single test file
npx jest --watch     # Watch mode
```

After any auth-related change, always run `npm run build` and `npm run test` to verify no regressions.

**Database (Supabase/Prisma):**
```bash
npx prisma generate          # Regenerate Prisma client
npx prisma migrate dev       # Run migrations locally
npx prisma db push           # Push schema changes without migration
npx prisma studio            # Open Prisma Studio GUI
```

## Architecture

### Framework & Routing

Next.js 14 **App Router** with route groups:
- `(app)/` — Protected routes (requires auth + onboarding). Layout at `src/app/(app)/layout.tsx` validates session and loads sidebar.
- `(auth)/` — Public auth pages (`/login`, `/register`).
- `(landing)/` — Public marketing pages.
- `api/` — API route handlers (App Router convention: `route.ts` files).

### Authentication (Supabase Auth with `@supabase/ssr`)

Three Supabase clients exist and must not be mixed:
- **Browser client**: `src/lib/supabase/client.ts` — for `"use client"` components.
- **Server client**: `src/lib/supabase/server.ts` — for server components and API routes.
- **Admin client**: `src/lib/supabase/admin.ts` — service-role key, server-only (has fallback).

Route protection lives in two layers:
1. `src/middleware.ts` — checks session on every request; redirects unauthenticated users to `/login` for protected routes.
2. `src/app/(app)/layout.tsx` — server component that validates session and redirects to `/login` or `/onboarding` as needed.

Public routes are explicitly allowlisted in `middleware.ts`: `/`, `/login`, `/register`, `/pricing`, `/auth/callback`, `/api/webhooks`.

### User Identity Model

Supabase Auth is the source of truth (`auth.users.id`). The app uses a **Supabase `profiles` table** (not a Prisma `User` table) as the primary user record. The critical bridge function is:

```typescript
// src/lib/supabase-db-user.ts
getOrCreateUserForSupabaseId(supabaseId, email, name?, image?) → AppUser
```

This reads/creates a profile row and returns a typed `AppUser` object. **Always use this function** to resolve the current user — never query profiles directly or use the Supabase auth ID as a primary key for app data.

### Database Access

**Runtime**: `src/lib/db.ts` provides an in-memory Prisma-compatible store (a global singleton with Proxy-based model access). This is used instead of a live Prisma connection at runtime. The API is Prisma-like: `db.topic.findMany({ where: {...}, include: {...} })`.

**Supabase direct queries**: Used for `profiles` and `usage_events` via the server Supabase client (RLS-protected, `auth.uid()` based).

**Types**: `src/lib/db-types.ts` mirrors all Prisma enums as runtime-available constants (`Plan`, `Tier`, `SubscriptionStatus`, `ReviewStatus`, `ErrorType`, etc.).

### Learning Science System (`src/lib/learning/`)

- `sm2.ts` / `mastery-pure.ts` — SM-2 spaced repetition algorithm (ease factor, interval calculation).
- `mastery.ts` — Mastery level computation (novice → developing → proficient → mastered) combining rating scores, first-try rates, and coverage.
- `interleaving.ts` — Round-robin selection across topics for interleaved practice.
- `reviewMode.ts` — Review session selection (spaced, interleaved, focused, weak-areas).
- `aiClassifiers.ts` — LLM-powered error classification into taxonomy (`CONCEPTUAL_GAP`, `ALGEBRAIC_SLIP`, etc.).
- `featureFlags.ts` — Runtime toggles for learning features (spaced repetition, interleaving, error analysis, etc.) stored in the `feature_flags` DB table. API routes check flags before execution.

**Core Learning Loop (Study/Review Flow):**
1. Server page queries `db.userProblem.findMany({ where: { nextReviewAt <= now } })` for due problems.
2. `buildInterleavedQueue()` mixes due + new problems across topics (round-robin).
3. `ReviewSessionClient` renders problems; user submits answer → `POST /api/problems/[id]/attempt`.
4. `gradeAnswer()` via Groq LLM determines correctness; `classifyError()` if wrong; `generateElaborationPrompt()` if correct.
5. `ProblemAttempt` record created; `UserProblem` SM-2 state updated (ease factor, interval, next review date).
6. User self-rates confidence (0-5) → session completes → mastery and streak recomputed.

### Billing & Usage Limits (`src/lib/billing/`)

Three tiers: FREE, PRO ($6.99/mo), MAX ($16.99/mo). Usage is tracked in daily buckets via `consumeUsage()` and `ensureFeatureAccess()` which throw `BillingLimitError` (429/403) when limits are hit. Paddle handles payments via webhooks at `/api/billing/webhook`.

### AI Integration

Groq SDK (`src/lib/groq.ts`) powers the AI tutor chat and error classification. The shared client should be used for all Groq API calls — not raw `fetch()`.

### Key Tech Choices

- **Styling**: Tailwind CSS with Radix UI primitives (`src/components/ui/`).
- **Math rendering**: KaTeX via `react-katex`.
- **Env validation**: Zod schemas in `src/lib/env.ts`.
- **Path alias**: `@/*` maps to `./src/*`.
- **Deployment**: Vercel (auto-deploy on push to main).

## Critical Rules

1. **Never bypass `src/lib/supabase-db-user.ts`** for identity mapping. All user-scoped queries must go through `AppUser.id` (the profile's primary key), not the Supabase auth ID.
2. **Never remove middleware auth checks** without a replacement. The middleware is the first line of defense for route protection.
3. **Never introduce a new auth provider.** Only email/password and Google OAuth are supported.
4. **API routes must check auth** via `supabase.auth.getUser()` and return 401 if null.
5. **Use the shared Groq client** (`import { groq } from "@/lib/groq"`) — not raw fetch to the Groq API.

## Known Issues (see FIXES_TODO.md for full list)

- `GROQ_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be set in `.env.local` or AI features and profile writes crash.
- `gradeAnswer()` in `aiClassifiers.ts` silently catches all errors — a Groq outage marks all answers incorrect.
- Some `console.log` statements in auth pages should be gated behind `NODE_ENV === "development"`.
- `next.config.mjs` currently has `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true` — these should be re-enabled after fixing outstanding errors.
