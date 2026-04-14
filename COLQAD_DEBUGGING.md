# COLQAD DEBUGGING GUIDE

Use this guide when authentication or protected routing breaks.

## Rule 1

Always read the file before editing it and run verification commands after each fix.

## Rule 2

After auth-related changes, run:

```bash
npm run build
npm run test
```

## Diagnose Login Failures

1. Check browser network response for /auth/v1/token calls.
2. Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
3. Confirm login page calls signInWithPassword.

## Diagnose OAuth Failures

1. Confirm login/register call signInWithOAuth with redirectTo ending in /auth/callback.
2. Confirm callback route exists at src/app/auth/callback/route.ts.
3. Confirm Supabase dashboard provider config includes redirect URLs:
- http://localhost:3000/auth/callback
- https://<your-production-domain>/auth/callback

## Diagnose Redirect Loops

1. Read src/middleware.ts.
2. Confirm /auth/callback is in public routes.
3. Confirm protected app layout redirects unauthenticated users to /login.
4. Confirm auth pages redirect authenticated users to /dashboard.

## Diagnose Session Persistence Issues

1. Confirm middleware uses @supabase/ssr createServerClient.
2. Confirm middleware cookies setAll updates request and response cookies.
3. Confirm server components use src/lib/supabase/server.ts createServerClient.

## Diagnose User Mapping Issues

1. Confirm Prisma User has supabaseId.
2. Confirm getOrCreateUserForSupabaseId is called after auth.getUser().
3. Confirm app queries use internal dbUser.id for relational data.

## Useful Commands

```bash
# Validate no legacy auth references in runtime code
rg -n "legacy auth|sign-in|sign-up|getServerSession|next-auth" src

# Validate callback wiring
rg -n "auth/callback|signInWithOAuth|exchangeCodeForSession|verifyOtp" src

# Validate middleware and route guards
cat src/middleware.ts
cat src/app/(app)/layout.tsx
```

## Final Checklist

- Build passes
- Tests pass
- Logged-out access to protected route redirects to /login
- Login and register work for email/password
- Google OAuth redirects back through callback route
- Callback sends user to onboarding if profile incomplete, else dashboard
- No auth-related blank screens
