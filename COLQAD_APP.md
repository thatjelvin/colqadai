# COLQAD APP SKILL

This file defines product context and system architecture for Colqad.

## What Is Colqad

Colqad is an AI-powered math learning web app for university-level learners. It combines:

- Spaced repetition
- Retrieval practice
- Interleaved practice
- Error analysis

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Auth | Supabase Auth with @supabase/ssr |
| Database | PostgreSQL (Supabase) via Prisma |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Monitoring | Sentry |

## Authentication System

Supabase handles all authentication.

### Supported auth methods
- Email/password sign-up and sign-in
- Google OAuth sign-in

### Auth flow
1. User signs in at /login or signs up at /register
2. Supabase session cookie is established
3. Middleware and protected app layout validate session
4. Callback route completes OAuth/email-confirmation sessions
5. User is redirected to:
- /onboarding when profile is incomplete
- /dashboard when profile is complete

## Session and Route Protection

### Public routes
- /
- /login
- /register
- /pricing
- /auth/callback
- /api/webhooks

### Protected routes
Any route outside the public list requires an authenticated user.

### Core files
- src/middleware.ts
- src/app/(app)/layout.tsx
- src/lib/supabase/server.ts
- src/lib/supabase/client.ts
- src/app/auth/callback/route.ts

## Database Identity Model

User identity is mapped from Supabase Auth to Prisma User:

- Prisma primary key: User.id (internal app id)
- Auth mapping key: User.supabaseId (unique)

Use src/lib/supabase-db-user.ts to resolve or create app users safely.

## Environment Variables

Required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- DATABASE_URL
- GEMINI_API_KEY

Optional:
- NEXT_PUBLIC_SITE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Routing Notes

- Auth pages: /login and /register
- OAuth callback: /auth/callback
- Main protected shell: src/app/(app)/layout.tsx

## Do Not Do

1. Do not introduce another auth provider.
2. Do not bypass src/lib/supabase-db-user.ts for identity mapping.
3. Do not use unprotected API handlers for user-scoped data.
4. Do not remove middleware auth checks without replacement.
