# COLQAD SKILLS — README
# These files tell you everything about the Colqad app.
# Read them in this order at the start of EVERY task.

---

## READING ORDER

1. Read COLQAD_APP.md first — what the app is, tech stack, auth system, routing
2. Read COLQAD_PATTERNS.md second — correct code for every common task
3. Read COLQAD_DEBUGGING.md when something is broken — how to diagnose and fix

---

## QUICK REFERENCE

| Question | Answer |
|---|---|
| What framework? | Next.js 14 App Router |
| What auth? | Clerk v5 (@clerk/nextjs@5.7.0) |
| What database? | Supabase (PostgreSQL) — database only, no Supabase auth |
| What hosting? | Vercel |
| Production URL? | colqad.tech |
| GitHub repo? | github.com/thatjelvin/colqadai |
| Can I upgrade Next.js? | NO — stays on v14 |
| Can I upgrade Clerk? | NO — stays on v5 |
| How do I get current user? | `const { userId } = await auth()` (server) or `useUser()` (client) |
| How do I query user data? | `.eq('clerk_user_id', userId)` |
| Are there RLS policies? | NO — empty, not configured |

---

## BEFORE STARTING ANY TASK

Run this and read the output:
```bash
find src -type f | sort
cat src/middleware.ts
cat src/app/layout.tsx
cat .env.local | cut -d'=' -f1
```

This gives you the current state of the app before you change anything.

---

## AFTER FINISHING ANY TASK

Always do these four things:
1. `npm run build` — must pass with zero errors
2. `git add . && git commit -m "your message" && git push`
3. Watch Vercel build — must succeed
4. Check colqad.tech works in browser
