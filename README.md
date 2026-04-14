# COLQAD SKILLS - README

Read these files at the start of every task:

1. COLQAD_APP.md
2. COLQAD_PATTERNS.md
3. COLQAD_DEBUGGING.md

## Quick Reference

| Question | Answer |
|---|---|
| Framework | Next.js 14 App Router |
| Auth | Supabase Auth using @supabase/ssr |
| Database | Supabase PostgreSQL via Prisma |
| Hosting | Vercel |
| Main user flow | Sign up/sign in -> onboarding (if needed) -> dashboard |

## Auth Stack Summary

- Browser auth client: src/lib/supabase/client.ts
- Server auth client: src/lib/supabase/server.ts
- Route protection: src/middleware.ts and src/app/(app)/layout.tsx
- OAuth callback: src/app/auth/callback/route.ts
- DB identity mapping: src/lib/supabase-db-user.ts (User.supabaseId)

## Before Starting Any Task

```bash
find src -type f | sort
cat src/middleware.ts
cat src/app/(app)/layout.tsx
cat src/lib/supabase/server.ts
```

## After Finishing Any Task

1. `npm run build` must pass
2. `npm run test` should pass
3. Confirm no auth regressions:
- logged-out user hitting protected route -> /login
- logged-in user hitting /login or /register -> /dashboard
- OAuth callback redirects correctly
