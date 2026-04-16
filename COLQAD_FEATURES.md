# COLQAD_FEATURES.md

## Purpose

This document provides a comprehensive description of every feature in the Colqad application. It is intended to give enough context to design a pricing strategy across Free, Pro, and Max tiers.

---

## Overview

Colqad is a research-backed AI-powered math learning web app for university STEM students. The core learning methodology combines:

- **Retrieval practice** — students attempt problems before seeing solutions
- **Spaced repetition (SM-2 algorithm)** — problems are re-scheduled based on performance
- **Interleaved practice** — review sessions mix topics to improve long-term retention

**Stack:** Next.js 14 (App Router) · Supabase (PostgreSQL + Auth + Storage) · Prisma ORM · Tailwind CSS · Google Gemini AI · Deployed on Vercel

---

## Pages & Features

### 1. Dashboard (`/dashboard`)

**What it does:**
- Displays a welcome message using the user's name
- Shows 4 quick-stat cards: current streak (days), total problems reviewed, mastery percentage, and problems due today
- **Content Upload section** — users can upload learning material in four formats:
  - Plain text / notes (paste directly)
  - PDF (file upload, text extracted server-side)
  - Image (JPG/PNG, processed by Gemini multimodal)
  - YouTube video link (processed by Gemini video understanding)
- After submission, an AI-generated **Concept Summary** is produced using `gemini-2.0-flash` and displayed in a collapsible card
- Recent summaries are shown below the upload form (latest 20)
- Quick Access shortcuts link to: Spaced Review, Topics, AI Tutor, Notebooks (PRO), Analytics (PRO)
- "Start Review" call-to-action appears when items are due

**Supabase tables read:** `materials` (summaries), `/api/dashboard/overview` → Prisma `user_problems`
**Supabase tables written:** `materials`
**Supabase Storage:** `materials` bucket (uploaded PDFs and images)
**API routes:** `GET/POST /api/materials`, `GET /api/dashboard/overview`

**Status:** ✅ Functional (as of this PR)
**Tier:** Free (all users)

---

### 2. Onboarding (`/onboarding`)

**What it does:**
- Collects initial profile data: education level/grade, primary course, age, and referral source
- Submits to `/api/user/onboarding` which upserts the `profiles` table and sets `onboarding_completed = true`
- Redirected to after first login (auth callback, or immediately after signup if email confirmation is disabled)
- After completion, user is redirected to `/dashboard`

**Supabase tables written:** `profiles` (grade, course, age, source, onboarding_completed)
**Gate logic:** `AppLayout` server component checks `onboardingCompleted` from profile; if false, redirects to `/onboarding`

**Status:** ✅ Functional (onboarding redirect restored in this PR)
**Tier:** Required for all users before accessing the app

---

### 3. Topics (`/topics`)

**What it does:**
- Lists all math topics in a hierarchical tree (parent topics with subtopics)
- Shows per-topic mastery progress (mastered / total problems, percentage bar)
- Each topic links to its detail page (`/topics/[slug]`) where problems can be started

**Supabase tables read:** Prisma `Topic`, `Problem`, `UserProblem`
**Status:** ✅ Functional
**Tier:** Free

---

### 4. Topics Detail (`/topics/[slug]`)

**What it does:**
- Shows all problems within a specific topic
- Displays each problem's status (NEW, LEARNING, REVIEW, MASTERED) with badges
- Links to the study/practice view for each problem
- Shows mastery percentage for the topic

**Supabase tables read:** Prisma `Topic`, `Problem`, `UserProblem`
**Status:** ✅ Functional
**Tier:** Free (20 problem starts/day on Free; 200 on Pro; 1000 on Max)

---

### 5. Spaced Repetition Review (`/study`)

**What it does:**
- Shows problems due today and overdue problems, sorted by an interleaved queue
- Displays: items due today, overdue count, estimated session time
- Review queue lists individual problems with their topic and overdue status
- "Start Review" button starts from the first due problem
- Sidebar shows interleaved session quality (number of topics mixed)

**Supabase tables read:** Prisma `UserProblem` (with `nextReviewAt` filter)
**API routes:** Uses Prisma DB directly in server component
**Status:** ✅ Functional
**Tier:** Free

---

### 6. Study / Problem View (`/study/[problemId]`)

**What it does:**
- Presents a single math problem (LaTeX rendered)
- Requires user to write an answer before revealing the solution (retrieval-first design)
- After answering, shows worked solution with LaTeX
- User self-rates their performance (1–5 scale)
- SM-2 algorithm updates `UserProblem` interval, ease factor, and `nextReviewAt`
- Tracks `errorType` (CONCEPTUAL_GAP, ALGEBRAIC_SLIP, etc.) on incorrect attempts
- Reflection prompt: after correct first attempt, user writes a short elaborative interrogation response
- Worked example mode: student can study the worked example and self-assess
- AI tutor chat panel (problem-scoped): only reveals full solution if user has already attempted

**Supabase tables read/written:** Prisma `Problem`, `UserProblem`, `ProblemAttempt`, `Reflection`, `WorkedExampleSession`
**API routes:** `/api/problems/[id]/start`, `/api/problems/[id]/attempt`, `/api/problems/[id]/review`, `/api/problems/[id]/worked-example`
**Billing:** `PROBLEM_START` usage event consumed (20/day Free, 200/day Pro, 1000/day Max)
**Status:** ✅ Functional
**Tier:** Free (usage-limited)

---

### 7. AI Tutor Chat (`/chat`)

**What it does:**
- Left sidebar shows conversation history (all previous chat sessions, latest first)
- Chat history persists to database and is loaded when selecting a session
- "New Chat" button starts a fresh conversation
- When a previous session is selected, all messages are loaded from the database
- The AI (Gemini 2.5 Flash) receives the full message history as context
- Supports freeform math questions and problem-scoped tutoring
- LaTeX rendering for mathematical notation
- Streaming responses
- Billing overlay shown when daily limit is reached
- Plan badge + usage meter in sidebar

**Supabase tables read/written:** Prisma `ChatSession`, `ChatMessage`
**API routes:** `POST /api/chat`, `GET /api/chat/sessions`, `GET /api/chat/sessions/[id]`
**Billing:** `CHAT_MESSAGE` (10/day Free, 120/day Pro, 600/day Max) and `NEW_CHAT_SESSION` (3/day Free, 30/day Pro, 120/day Max) usage events consumed
**Status:** ✅ Functional — history persistence fixed in this PR
**Tier:** Free (usage-limited) / Pro+Max for higher quotas

---

### 8. Notebooks (`/notebooks`) — PRO FEATURE

**What it does:**
- Lets users create named notebook workspaces (e.g. "Calculus II")
- Each notebook can ingest multiple source documents: plain text or PDF
- Text extraction from PDFs (server-side, no third-party library)
- Documents are chunked into 1,200-character overlapping segments
- "Generate Summary + Concepts" produces:
  - A grounded summary from scored high-value sentences
  - A list of up to 12 extracted concepts with explanations and evidence chunk references
- Summary and concepts are stored and displayed on the notebook detail page
- Multiple notebooks can be created and managed

**Supabase tables read/written:** Prisma `Notebook`, `NotebookDocument`, `NotebookChunk`, `NotebookSummary`, `NotebookConcept`
**API routes:** `GET/POST /api/notebooks`, `GET/PUT/DELETE /api/notebooks/[id]`, `GET/POST /api/notebooks/[id]/documents`, `POST /api/notebooks/[id]/summary`
**Gate:** `ensureFeatureAccess(userId, "notebooks")` → throws `BillingLimitError` for FREE users
**Status:** ✅ Functional (Pro+Max only)
**Tier:** PRO / MAX

---

### 9. Reflections (`/reflections`)

**What it does:**
- Lists all elaborative interrogation responses written after successful problem attempts
- Shows the problem title, topic, the AI-generated reflection prompt, and the user's response
- Links to retry each problem
- Ordered by recency, max 200 shown

**Supabase tables read:** Prisma `Reflection` (with Problem and Topic joins)
**Status:** ✅ Functional
**Tier:** Free

---

### 10. Error Log (`/error-log`)

**What it does:**
- Lists all failed problem attempts (incorrect answers)
- Shows error type classification (CONCEPTUAL_GAP, ALGEBRAIC_SLIP, MISREAD_QUESTION, FORMULA_RECALL_FAILURE, WRONG_METHOD_CHOSEN)
- Helps students identify recurring error patterns

**Supabase tables read:** Prisma `ProblemAttempt` (where `isCorrect = false`)
**Status:** ✅ Functional
**Tier:** Free

---

### 11. Analytics (`/analytics`) — PRO FEATURE

**What it does:**
- Shows 4 key metric cards: Overall Accuracy (recall score %), Mastery %, Current Streak, Total Problems
- Focus Areas: identifies the most common error type in the past week
- Strong Areas: shows spaced-repetition mastery progress bar
- Uses `/api/dashboard/stats` which queries problem attempts, user problems, and error types

**API routes:** `GET /api/dashboard/stats`
**Gate:** `ensureFeatureAccess(userId, "analytics")` → throws `BillingLimitError` for FREE users
**Status:** ✅ Functional (Pro+Max only)
**Tier:** PRO / MAX

---

### 12. Settings (`/settings`)

**What it does:**
- Displays account info: email, plan badge, member since date
- Editable profile form: name, grade/education level, course/field of study, age
- Changes are saved to Supabase `profiles` table via `/api/user/onboarding` (POST)

**Supabase tables read/written:** `profiles`
**Status:** ✅ Functional
**Tier:** Free

---

### 13. Pricing (`/pricing`)

**What it does:**
- Displays Free, Pro ($6.99/mo), and Max ($16.99/mo) plan cards
- Lists features per plan
- "Upgrade" button links to Paddle checkout (if `PADDLE_*` env vars are configured)
- Visible to all users (public route)

**Status:** ✅ Functional UI; Paddle billing is optional and requires configuration
**Tier:** Public

---

### 14. Auth — Login (`/login`)

**What it does:**
- Email + password login via Supabase Auth
- "Continue with Google" OAuth button (shown when `NEXT_PUBLIC_SUPABASE_GOOGLE_AUTH_ENABLED=true`)
- Displays error messages from `?error=` query param
- Logged-in users are redirected away by middleware

**Status:** ✅ Functional
**Tier:** Public

---

### 15. Auth — Register (`/register`)

**What it does:**
- Email + password signup via `supabase.auth.signUp`
- Google OAuth signup
- If email confirmation is enabled in Supabase: shows "check your email" screen
- If email confirmation is disabled: session is created immediately, user is redirected to `/onboarding`
- `emailRedirectTo` points to `/auth/callback`

**Status:** ✅ Functional
**Tier:** Public

---

### 16. Auth Callback (`/auth/callback`)

**What it does:**
- Exchanges the Supabase OAuth code for a session
- Redirects to `/dashboard` on success (middleware and AppLayout then enforce the onboarding check)
- Redirects to `/login?error=...` on failure

**Status:** ✅ Functional
**Tier:** Public

---

## Supabase Tables

### Supabase-managed tables (accessed via Supabase client)

| Table | Description |
|---|---|
| `auth.users` | Supabase Auth — stores hashed passwords, email, OAuth identities, metadata |
| `public.profiles` | Per-user profile: `id` (= auth.users.id), `email`, `full_name`, `avatar_url`, `grade`, `course`, `age`, `source`, `plan` (FREE/PRO/MAX), `subscription_status`, `subscription_current_period_end`, `paddle_customer_id`, `paddle_subscription_id`, `paddle_price_id`, `created_at`, `updated_at`, `onboarding_completed` |
| `public.usage_events` | Daily usage tracking per user per feature: `user_id`, `feature` (CHAT_MESSAGE/NEW_CHAT_SESSION/PROBLEM_START), `bucket` (date), `count` |
| `public.materials` | Dashboard-uploaded materials: `id`, `user_id`, `type` (pdf/ppt/image/youtube/note), `title`, `summary` (AI-generated), `storage_url`, `created_at` |

### Prisma-managed tables (accessed via Prisma ORM / PostgreSQL)

| Table | Description |
|---|---|
| `User` | Mirror of auth user with billing fields: `supabaseId`, `email`, `name`, `plan`, `tier`, `subscriptionStatus`, `paddleCustomerId`, etc. Also holds: `referralCode`, `referredById`, `proUntil` |
| `Topic` | Math topics: `name`, `slug`, `description`, `parentId` (hierarchical), `order` |
| `Problem` | Math problems: `topicId`, `title`, `body` (LaTeX), `solution` (LaTeX), `difficulty` (EASY/MEDIUM/HARD), `topicTag` |
| `UserProblem` | Per-user spaced-repetition state: `easeFactor`, `interval`, `repetitions`, `nextReviewAt`, `lastReviewedAt`, `status` (NEW/LEARNING/REVIEW/MASTERED), `attemptsBeforeCorrect` |
| `ProblemAttempt` | Individual answer attempts: `userAnswer`, `isCorrect`, `attemptNumber`, `errorType`, `errorExplanation`, `selfQuizMode` |
| `Reflection` | Elaborative interrogation responses: `prompt`, `response`, linked to `ProblemAttempt` |
| `WorkedExampleSession` | Worked example study sessions: `studyDurationSeconds`, `generateAttempt`, `selfAssessedMatch` |
| `ChatSession` | Chat conversation: `userId`, `problemId` (nullable), `title` (AI-generated), `createdAt` |
| `ChatMessage` | Individual messages: `sessionId`, `role` (USER/ASSISTANT), `content`, `createdAt` |
| `UsageEvent` | Daily feature usage buckets (mirrors Supabase `usage_events` for Prisma access) |
| `Notebook` | Notebook workspace: `userId`, `title`, `description` |
| `NotebookDocument` | Ingested source document: `sourceType` (TEXT/PDF), `rawText`, `contentHash`, `chunkCount`, `charCount`, `ingestionStatus` |
| `NotebookChunk` | 1,200-char overlapping text segment from a document |
| `NotebookSummary` | AI-generated summary from notebook chunks: `summary`, `keyPoints`, `sourceChunkIds` |
| `NotebookConcept` | Extracted concept: `name`, `explanation`, `evidenceChunkIds`, `confidence` |
| `FeatureFlag` | Boolean feature flags by name (managed via DB admin) |
| `LearningAnalytics` | Aggregated learning analytics per method: `sessionKey`, `method` (LearningMethod enum), `aggregate` (JSON) |
| `Referral` | Referral tracking: `referrerId`, `referredUserId`, `rewarded` |

---

## Billing & Plan System

### Plans

| Plan | Price | Chat Messages/day | Chat Sessions/day | Problem Starts/day | Analytics | Notebooks | Priority | Early Access |
|---|---|---|---|---|---|---|---|---|
| Free | $0 | 10 | 3 | 20 | ❌ | ❌ | ❌ | ❌ |
| Pro | $6.99/mo | 120 | 30 | 200 | ✅ | ✅ | ❌ | ❌ |
| Max | $16.99/mo | 600 | 120 | 1000 | ✅ | ✅ | ✅ | ✅ |

### How Plan Checks Work

1. **Daily usage limits** (`consumeUsage`): Checked before every chat message send, chat session creation, and problem start. Uses `usage_events` table (day-bucketed counters). Throws `BillingLimitError` (HTTP 429) when limit exceeded.
2. **Feature access gates** (`ensureFeatureAccess`): Analytics and Notebooks check `limits.analyticsAccess` / `limits.notebooksAccess` on the plan. Throws `BillingLimitError` (HTTP 403) for free users.
3. **Plan normalization** (`normalizePlan`): If a paid subscription is CANCELED and the period hasn't ended, the paid plan is still honored.

### Payment Provider

- **Paddle** (sandbox or production, configured via env vars)
- Paddle Billing webhooks update `profiles.plan` and `profiles.subscription_status`
- `PADDLE_PRO_PRICE_ID` and `PADDLE_MAX_PRICE_ID` are the price IDs for checkout

---

## Feature Flags

Stored in the `FeatureFlag` Prisma model. Feature flags can be toggled via direct DB admin. Currently used in `/api/learning/flags` route. No UI for managing flags exists.

---

## Locked Features Summary

| Feature | Locked For | Condition |
|---|---|---|
| Notebooks | FREE users | `limits.notebooksAccess = false` |
| Analytics page | FREE users | `limits.analyticsAccess = false` |
| AI chat (beyond 10/day) | FREE users | Daily usage limit |
| New chat sessions (beyond 3/day) | FREE users | Daily usage limit |
| Problem starts (beyond 20/day) | FREE users | Daily usage limit |
| Priority AI responses (longer context) | FREE + PRO | `limits.priorityResponses = false` |
| Early access features | FREE + PRO | `limits.earlyAccess = false` |

---

## Free vs Premium — Value Assessment

### Clearly Free (should stay free)
- Dashboard (stats + material upload + quick summaries)
- Onboarding
- Topics browsing
- Spaced Repetition Review (the core learning loop)
- Problem practice (usage-limited, not locked)
- AI Tutor Chat (usage-limited)
- Reflections log
- Error log
- Settings

### Clearly Premium (worth paying for)
- **Notebooks** — full source workspace with chunking, concept extraction, grounded summaries; requires significant AI and storage compute
- **Analytics** — detailed mastery breakdown, error pattern analysis, recall score; reveals insights from long-term data
- **High AI quotas** — power users who use the AI tutor heavily for homework/exam prep
- **Priority AI processing** — lower latency / more output tokens (Max plan uses 4096 vs 3000 tokens)
- **Early access** — experimental features (retention experiments, new learning modes)

### Borderline (could be free with lower limits, paid for higher)
- Material upload summaries (free as-is, but could limit to e.g. 5 summaries/day on Free)
- Number of notebooks created (currently unlimited for Pro/Max, could be 0 Free, 5 Pro, unlimited Max)
- Number of problems available (currently all topics are accessible; could gate advanced topics)

---

## Notes for Pricing Strategy

1. **Core loop must be free**: Spaced repetition + practice problems are the differentiating feature. Locking them fully would kill user acquisition. Usage limits (20 problems/day free) are appropriate.

2. **Notebooks is the clearest Pro paywall**: It involves heavy AI compute (summarization, concept extraction), chunking storage, and is a power feature only used by committed students.

3. **Analytics is a retention hook for Pro**: Students who see their mastery % and streak are more engaged. Offering a teaser (e.g., 7-day history for free) could improve conversions.

4. **Material Upload Summaries are a conversion driver**: The quick AI summary on the dashboard is the fastest "wow moment" for new users. Keep it free but rate-limit it (e.g., 3–5/day free) to drive upgrades.

5. **Chat quota is already well-designed**: 10 messages/day is enough to try the AI tutor; 120/day (Pro) supports regular use. Max's 600/day is for power users.

6. **Streak and review reminders** (currently via `/api/cron/reminders`) could be a Pro feature to drive retention among paid users.
