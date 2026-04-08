# Security Audit Report

This document tracks the findings and fixes applied during the full-stack security audit.

## Severity Definitions
- **Critical**: Can lead to full account takeover, data breach, or RCE
- **High**: Unauthorized data access, privilege escalation, significant data exposure
- **Medium**: Information leakage, missing rate limits, weak validation
- **Low**: Best practice violations, minor hardening improvements

## Findings

### 1. Hardcoded Secrets in Git History
**Severity:** Critical
**Location:** `.env` and `.gitignore`
**Description:** The `.env` file contained connection strings mimicking production defaults and was tracked by git because there was no `.env` entry in `.gitignore`. 
**Fix:** Added `.env` to `.gitignore` and removed the tracked `.env` file from git using `git rm --cached .env`.

### 2. Missing Row Level Security (RLS) on Database
**Severity:** Critical
**Location:** `prisma/schema.prisma` / Supabase Database
**Description:** Supabase exposes `NEXT_PUBLIC_SUPABASE_ANON_KEY` client-side, but Prisma migrations never enabled RLS on tables. Because the `anon` role is highly privileged by default without RLS, any external user could leverage the anonymous key to read/write/delete data (e.g., `User` records) via the Supabase REST API `[id].supabase.co/rest/v1/User`.
**Fix:** Removed unused `src/lib/supabase/client.ts` exposure since the application only relies on Prisma server-side. Additionally, all tables require RLS setup (documented in *Migrations* below) to enforce security at the database boundary against the anon key.

### 3. IDOR and Unauthorized Creation in Reflections
**Severity:** High
**Location:** `src/app/api/reflections/route.ts`
**Description:** The `POST /api/reflections` route allowed any authenticated user to create reflections tied to arbitrary `problemId` and `attemptId` values, potentially corrupting or associating content with others.
**Fix:** Validated that `userProblem` and `problemAttempt` actually belong to `session.user.id` before allowing creation. 

### 4. Prompt Injection in Chat Titles
**Severity:** Medium
**Location:** `src/app/api/chat/route.ts` 
**Description:** Anthropic prompt for `generateTitle` directly interpolated `message` into the user content payload (`Generate a title for a chat that starts with this message: "${message}"`). A malicious user input could manipulate the LLM's response completely.
**Fix:** Migrated instruction to the `system` parameter and only passed `message` securely as `role: "user", content: message`.

### 5. Unauthenticated Cron Job Access
**Severity:** High
**Location:** `src/app/api/cron/reminders/route.ts`
**Description:** The endpoint to trigger reminder emails to all users was fully unauthenticated (the header check was commented out). Any user could repeatedly trigger `GET /api/cron/reminders` resulting in massive email spam and depletion of Resend quotas (Denial of Wallet).
**Fix:** Uncommented and enforced the `Authorization: Bearer ${process.env.CRON_SECRET}` verification check.

### 6. Missing Rate Limiter on User Registration
**Severity:** Medium
**Location:** `middleware.ts` & `src/app/api/auth/register/route.ts`
**Description:** There was no rate limit governing user account creation, exposing the application to brute-force registrations that could bloat the database limits.
**Fix:** Added a rolling IP-based Upstash redis rate limiter within `middleware.ts` for `/api/auth/register` (max 5 requests per hour), and updated the `matcher` to ensure it intercepts.

### 7. Missing Expiration Check on Webhook Signature
**Severity:** Low
**Location:** `src/lib/payments/paddle.ts`
**Description:** `verifyPaddleWebhookSignature` properly validates HMAC signatures but trusts webhooks regardless of how old the `timestamp` is, meaning if a payload was captured, it could theoretically be replayed.
**Fix:** Implemented a 5-minute tolerance window check on `timestamp` against `Date.now()`.

## Required Actions / Migrations

### RLS Implementation Migration
SQL must be run manually to lock down Supabase from the `anon` key. Since Prisma does not use Postgres RLS, we can restrict ALL tables purely by enabling RLS.

```sql
-- Disable anon access to all tables so REST API is blocked
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Topic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Problem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProblem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProblemAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reflection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY;
-- Apply same for all other schema.prisma tables
-- Do not add any policies, rendering them queryable ONLY to authenticated DB proxies (PostgREST 'service_role' or postgres user).
```
