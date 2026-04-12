# COLQAD DEBUGGING SKILL
# Read this when something is broken. It tells you exactly how to diagnose
# and fix every common problem in this app without guessing.

---

## RULE 1: ALWAYS READ BEFORE YOU WRITE

Before changing ANY file:
1. Run `cat [filename]` and show the full contents
2. Identify exactly what is wrong and why
3. State the fix you will apply
4. Apply the fix
5. Show the complete before and after

Never edit a file you haven't read. Never delete a file you haven't read.

---

## RULE 2: ALWAYS VERIFY WITH COMMANDS

Never say "this should work" or "this looks correct" without running a command to prove it.

After every fix run:
```bash
npm run build
```
If it fails, fix the error. Run build again. Repeat until zero errors.

---

## DIAGNOSING A BLANK WHITE SCREEN

A blank white screen means one of these things. Check them in order:

### Check 1 — Is there a runtime error?
Open browser DevTools → Console tab. If there is a red error, that is your answer.
Read the error message and the file/line number it points to.

### Check 2 — Is auth() returning null?
In any server component dashboard page:
```typescript
const { userId } = await auth()
console.log('userId:', userId) // add this temporarily
if (!userId) redirect('/sign-in')
```
If userId is null, the user is not authenticated from the server's perspective.
This means either middleware is not working or ClerkProvider is missing from layout.tsx.

### Check 3 — Is a Supabase query returning null?
If the page fetches data and gets nothing back, add logs:
```typescript
const { data, error } = await supabase.from('table').select('*').eq('clerk_user_id', userId)
console.log('data:', data, 'error:', error)
```
If data is null and error is null, the row doesn't exist — create it.
If error exists, the query is wrong — check the table name and column name.

### Check 4 — Is there a missing error.tsx or loading.tsx?
If a child component crashes with no error boundary, the whole page goes blank.
Always create these two files in every route folder:
- `error.tsx` — catches crashes
- `loading.tsx` — shows spinner while data loads

### Check 5 — Is the component tree correct?
Server components cannot use hooks (useState, useEffect, useUser).
Client components cannot use async/await at the top level or call auth().
If mixed up, add or remove 'use client' as needed.

---

## DIAGNOSING AUTH REDIRECT LOOPS

Symptom: user gets bounced between /sign-in and /dashboard endlessly.

Cause: middleware is redirecting an authenticated user away from a protected route,
or redirecting an unauthenticated user in a loop.

Fix: read middleware.ts and check:
1. Is `/dashboard` listed in `isPublicRoute`? It must NOT be.
2. Is the `userId` check correct? `const { userId } = await auth()`
3. Is there a double redirect somewhere — middleware redirecting AND the page redirecting?

---

## DIAGNOSING BUILD FAILURES

### Error: "Module not found"
Someone deleted or renamed a file that is still being imported.
Run: `grep -r "from '[the missing module]'" src`
Find all imports of that module and either restore the file or update the imports.

### Error: "Type error: X is not assignable to type Y"
A TypeScript type mismatch. Read the error — it tells you the file and line.
Fix the type, do not use `as any` unless absolutely necessary.

### Error: peer dependency conflict
Clerk version is too high for Next.js 14.
Fix: `npm uninstall @clerk/nextjs && npm install @clerk/nextjs@5.7.0`
Make sure package.json shows `"@clerk/nextjs": "5.7.0"` with NO caret (^).

### Error: environment variable undefined
A `process.env.VARIABLE!` is being used but the variable doesn't exist.
Check .env.local has the variable. If it's a build-time variable on Vercel,
check Vercel dashboard → Settings → Environment Variables.

---

## DIAGNOSING SUPABASE QUERY FAILURES

### Getting null data with no error:
The row doesn't exist. Create it first:
```typescript
await supabase.from('table').insert({ clerk_user_id: userId, ...defaults })
```

### Getting "relation does not exist" error:
The table name is wrong. Check actual table names:
Go to Supabase dashboard → Table Editor and read the exact table names.
Table names are case-sensitive in PostgreSQL.

### Getting "column does not exist" error:
The column name is wrong. Read the actual schema:
```bash
find . -name "*.sql" | grep -v node_modules | xargs cat
```
Or check Supabase dashboard → Table Editor → click the table → see columns.

### Data saves but doesn't load:
The query filter is wrong. Check the `.eq()` column matches what was inserted.
If inserted with `clerk_user_id` but querying with `user_id`, it will return nothing.

---

## DIAGNOSING VERCEL DEPLOYMENT FAILURES

### npm install fails with ERESOLVE:
Peer dependency conflict. Add to Vercel build settings:
Settings → General → Install Command → `npm install --legacy-peer-deps`

### Build passes locally but fails on Vercel:
Environment variables are missing on Vercel.
Go to Vercel → Settings → Environment Variables and add all variables from .env.local.
Remember: use LIVE Clerk keys (pk_live_, sk_live_) for production, not test keys.

### Build fails with "module not found" only on Vercel:
A file import uses the wrong case (e.g., `Component` vs `component`).
Linux (Vercel) is case-sensitive, Mac is not. Fix the import case to match exactly.

---

## STANDARD FIX CHECKLIST

Every time you fix something, run through this list before declaring done:

- [ ] `npm run build` passes with zero errors
- [ ] No TypeScript errors
- [ ] No missing environment variables
- [ ] Dashboard shows content, not blank screen
- [ ] `/dashboard` redirects to `/sign-in` when logged out
- [ ] `/sign-in` redirects to `/dashboard` when logged in
- [ ] No console errors in browser
- [ ] Changes committed and pushed to main
- [ ] Vercel deployment succeeded
- [ ] Live site at colqad.tech works

---

## HOW TO READ THIS CODEBASE QUICKLY

Run these commands at the start of any task to understand the current state:

```bash
# See all files
find src -type f | sort

# See what's broken (TypeScript errors)
npx tsc --noEmit 2>&1 | head -50

# See all auth-related code
grep -rn "auth\|clerk\|userId\|session" src --include="*.ts" --include="*.tsx" -l

# See the middleware
cat src/middleware.ts

# See the dashboard
cat src/app/dashboard/page.tsx

# See the layout
cat src/app/layout.tsx

# See environment variable names (not values)
cat .env.local | cut -d'=' -f1
```
