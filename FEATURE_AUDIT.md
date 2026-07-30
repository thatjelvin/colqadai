# Colqad Feature Audit

> Generated: 2026-04-18  
> Branch: `copilot/generate-feature-audit-file`  
> Scope: every page, component, API route, and database schema

---

## How to read this document

Each feature entry follows this structure:

| Field | Meaning |
|---|---|
| **What it does** | Functional description |
| **Files** | Key source files (pages, components, API routes, lib) |
| **Status** | `✅ Fully built` · `⚠️ Partially built` · `🚧 Stub / shell` |
| **DB?** | Whether the feature reads or writes to the database |

---

## 1. Dashboard (`/dashboard`)

### 1.1 Personalised greeting with streak badge

**What it does:** Displays a time-sensitive greeting ("Good morning / afternoon / evening, {first name}") and appends a 🔥 streak indicator when the user has a streak > 0. Name is fetched from Supabase Auth metadata at runtime.

**Files:**
- `src/app/(app)/dashboard/page.tsx` — `DashboardPage` component, `getGreeting()`, `fetchUserName()`

**Status:** ✅ Fully built

**DB?** No — reads from Supabase Auth `user_metadata`, not the Prisma DB.

---

### 1.2 Stats row (Streak / Reviewed / Mastery / Due Today)

**What it does:** Four coloured stat cards showing the user's current study streak (consecutive days with at least one review), total problems ever seen, mastery percentage (problems with status `MASTERED`), and count of problems whose `nextReviewAt ≤ now`.

**Files:**
- `src/app/(app)/dashboard/page.tsx` — `fetchStats()`, stats render block
- `src/app/api/dashboard/overview/route.ts` — `GET /api/dashboard/overview`

**Status:** ✅ Fully built — streak calculation is real and correct (gaps reset to 0).

**DB?** Yes — queries `UserProblem` (status, lastReviewedAt, nextReviewAt).

---

### 1.3 Material upload & AI summarisation

**What it does:** Accepts four source types — **Note** (plain text paste), **PDF** (file upload), **Image** (JPG/PNG upload), **YouTube** (URL). Sends the source to `POST /api/materials`, which extracts text (PDF via custom parser, text direct), generates an AI summary via Groq (`llama-3.3-70b-versatile`), and saves the record to Supabase's `materials` table. YouTube and image summarisation are **not implemented** — a static fallback message is returned instead.

**Files:**
- `src/app/(app)/dashboard/page.tsx` — upload form, `handleSubmit()`
- `src/app/api/materials/route.ts` — `POST /api/materials`, `generateSummary()`
- `src/lib/notebooks/processing.ts` — `readPdfTextFromBase64()`, `normalizeSourceText()`

**Status:** ⚠️ Partially built — note/PDF upload + summarisation is real; YouTube transcript extraction and image OCR are both stubbed with static text responses.

**DB?** Yes — inserts into Supabase `materials` table (not Prisma); PDF/image binary is also uploaded to Supabase Storage.

---

### 1.4 Recent Summaries list

**What it does:** Fetches the user's 20 most recent materials (`GET /api/materials`) and renders them as expandable cards with a one-line preview. Clicking a card expands it to show parsed summary sections. For YouTube items, an "Open video ↗" link is provided.

**Files:**
- `src/app/(app)/dashboard/page.tsx` — `fetchMaterials()`, materials render block, `parseSummarySections()`

**Status:** ✅ Fully built

**DB?** Yes — reads from Supabase `materials` table.

---

### 1.5 Quick Access sidebar

**What it does:** Static navigation links to Spaced Review, Topics, AI Tutor, Notebooks (PRO), and Analytics (PRO). Free users clicking a PRO item are redirected to `/pricing` instead of the destination.

**Files:**
- `src/app/(app)/dashboard/page.tsx` — Quick Access block

**Status:** ✅ Fully built

**DB?** No — purely UI.

---

### 1.6 Due-problems nudge card

**What it does:** When `dueCount > 0`, shows an amber card with an animated "Start Review →" CTA linking to `/study`. If there are no due problems, shows a "You're all caught up!" card.

**Files:**
- `src/app/(app)/dashboard/page.tsx` — conditional card at bottom of Quick Access column

**Status:** ✅ Fully built

**DB?** Yes — via `dueCount` from `GET /api/dashboard/overview`.

---

## 2. Notebooks (`/notebooks` · `/notebooks/[id]`)

### 2.1 Notebook list & creation

**What it does:** Lists all user notebooks with document count, concept count, and last-updated date. Inline "Create Notebook" form collects title and optional description and calls `POST /api/notebooks`.

**Files:**
- `src/app/(app)/notebooks/page.tsx`
- `src/app/api/notebooks/route.ts` — `GET` (list) + `POST` (create)

**Status:** ✅ Fully built

**DB?** Yes — reads/writes `Notebook` table (Prisma).

---

### 2.2 Notebook deletion

**What it does:** Dropdown "Delete" menu item on each notebook card calls `DELETE /api/notebooks/[id]` and reloads the list.

**Files:**
- `src/app/(app)/notebooks/page.tsx` — `handleDeleteNotebook()`
- `src/app/api/notebooks/[id]/route.ts` — `DELETE`

**Status:** ✅ Fully built

**DB?** Yes — deletes `Notebook` row (cascades to documents, chunks, summaries, concepts).

---

### 2.3 Text source ingestion

**What it does:** User pastes raw text with a title. The API normalises it, splits it into overlapping 1 200-character chunks (`chunkText()`), persists a `NotebookDocument` record, and stores all chunks as `NotebookChunk` rows.

**Files:**
- `src/app/(app)/notebooks/[id]/page.tsx` — `uploadTextSource()`
- `src/app/api/notebooks/[id]/documents/route.ts` — `POST` with `sourceType: "TEXT"`
- `src/lib/notebooks/processing.ts` — `chunkText()`, `normalizeSourceText()`, `hashContent()`

**Status:** ✅ Fully built

**DB?** Yes — writes `NotebookDocument` + `NotebookChunk`.

---

### 2.4 PDF source ingestion

**What it does:** User uploads a PDF. The browser converts it to base64 and sends it. The API decodes, extracts text via a custom regex-based PDF stream parser (no external PDF library — works on simple PDFs), chunks the result, and stores documents + chunks.

**Files:**
- `src/app/(app)/notebooks/[id]/page.tsx` — `uploadPdfSource()`
- `src/app/api/notebooks/[id]/documents/route.ts` — `POST` with `sourceType: "PDF"`
- `src/lib/notebooks/processing.ts` — `extractPdfText()`, `readPdfTextFromBase64()`

**Status:** ⚠️ Partially built — PDF parsing uses a minimal home-grown regex extractor that will fail on encrypted, scanned (image), or complex PDFs. No external library (`pdf-parse`, `pdfjs`) is used. Very basic PDFs work; real student materials may not.

**DB?** Yes — writes `NotebookDocument` + `NotebookChunk`.

---

### 2.5 Grounded summary & concept extraction

**What it does:** "Generate Summary + Concepts" button calls `POST /api/notebooks/[id]/summary`. The server reads all stored chunks, runs a **deterministic** scoring algorithm (`generateGroundedSummary` + `generateConcepts` in `processing.ts`) to extract top sentences and concept names using regex pattern matching, then writes `NotebookSummary` and `NotebookConcept` rows.

**Files:**
- `src/app/(app)/notebooks/[id]/page.tsx` — `generateSummaryAndConcepts()`
- `src/app/api/notebooks/[id]/summary/route.ts`
- `src/lib/notebooks/processing.ts` — `generateGroundedSummary()`, `generateConcepts()`

**Status:** ⚠️ Partially built — the summarisation pipeline does **not** use an LLM. It is a TF-IDF-style sentence scorer with math-signal boosting. Concepts are extracted by naive regex (capitalised noun phrases + a hardcoded keyword list). Results are functional but rough, and can miss important concepts or hallucinate irrelevant ones. The API is hooked up and DB writes succeed.

**DB?** Yes — deletes + recreates `NotebookSummary` and `NotebookConcept` rows transactionally.

---

### 2.6 Document list display

**What it does:** Shows all ingested documents with chunk count, character count, source type badge, and creation time.

**Files:**
- `src/app/(app)/notebooks/[id]/page.tsx` — documents section

**Status:** ✅ Fully built

**DB?** Yes — reads from `NotebookDocument`.

---

## 3. Topics (`/topics` · `/topics/[slug]`)

### 3.1 Topic tree browser

**What it does:** Lists all root-level topics in order, with progress bars (mastered / total problems). Each topic card shows subtopics and problem counts. Powered by `TopicTree` component.

**Files:**
- `src/app/(app)/topics/page.tsx`
- `src/components/TopicTree.tsx`

**Status:** ✅ Fully built

**DB?** Yes — queries `Topic` (hierarchical, `parentId`), `Problem`, `UserProblem`.

---

### 3.2 Topic detail page

**What it does:** Shows all problems in a topic, each with a `ProblemCard` that displays status (NEW / LEARNING / REVIEW / MASTERED), difficulty badge, and a link to `/study/[problemId]`. Also shows a subtopics sidebar and overall mastery progress bar. "Start Interleaved Session" button links to `/study`.

**Files:**
- `src/app/(app)/topics/[slug]/page.tsx`
- `src/components/ProblemCard.tsx`

**Status:** ✅ Fully built

**DB?** Yes — queries `Topic` (by slug), `Problem`, `UserProblem`.

---

## 4. Review (`/study` · `/study/[problemId]`)

> The sidebar nav item "Review" maps to `/study`.

### 4.1 Review queue page (`/study`)

**What it does:** Fetches all due `UserProblem` records (`nextReviewAt ≤ now`) and passes them through `buildInterleavedQueue()` to produce a topic-interleaved ordering. Displays three stat cards (Due Today / Overdue / Estimated Time), a scrollable review queue list with overdue badges, and a "Start Review" button that links to the first problem. An "Interleaved Session Summary" sidebar card shows how many topics are in the queue.

**Files:**
- `src/app/(app)/study/page.tsx`
- `src/lib/learning/interleaving.ts` — `buildInterleavedQueue()`

**Status:** ✅ Fully built

**DB?** Yes — queries `UserProblem` (joined to `Problem`, `Topic`).

---

### 4.2 Problem practice page (`/study/[problemId]`)

**What it does:** Full problem-solving interface. On load, fetches the problem and calls `POST /api/problems/[id]/start` to create a `UserProblem` record if one doesn't exist. Features:
- **Timer** — elapsed seconds shown in the header.
- **MathRenderer** — renders LaTeX in the problem body.
- **Self-Quiz Mode toggle** — hides solution until after submission (default on).
- **Worked Example Mode toggle** — study→cover→generate three-phase flow with 60 s minimum study timer.
- **Answer submission** — text answer is AI-graded by Groq. Returns `isCorrect`, `rationale`, error classification (`errorType`), and elaboration prompt.
- **Elaborative interrogation** — on a correct answer, an AI-generated follow-up question is shown; user types a reflection and saves it.
- **SM-2 self-rating** — 0–5 rating triggers `POST /api/problems/[id]/review`, which runs the SM-2 algorithm and schedules next review.
- **Auto-advance** — after rating, fetches next due problem and navigates to it (or to dashboard if queue is empty).
- **Context chat** — embedded `ChatInterface` in the sidebar, scoped to the current problem.

**Files:**
- `src/app/(app)/study/[problemId]/page.tsx`
- `src/components/MathRenderer.tsx`
- `src/components/ChatInterface.tsx`
- `src/app/api/problems/[id]/start/route.ts`
- `src/app/api/problems/[id]/attempt/route.ts`
- `src/app/api/problems/[id]/review/route.ts`
- `src/app/api/problems/[id]/worked-example/route.ts`
- `src/lib/sm2.ts`
- `src/lib/learning/aiClassifiers.ts`

**Status:** ✅ Fully built — this is the most complete part of the app. All learning-science mechanisms (retrieval, error analysis, elaborative interrogation, worked-example, spaced repetition) are wired end-to-end.

**DB?** Yes — reads/writes `UserProblem`, `ProblemAttempt`, `WorkedExampleSession`, `Reflection`, `LearningAnalytics`.

---

### 4.3 Due-problems API (`/api/problems/due`)

**What it does:** Returns the user's next batch of due problems ordered by `nextReviewAt asc`. Used by the practice page after rating to find the next problem.

**Files:**
- `src/app/api/problems/due/route.ts`

**Status:** ✅ Fully built

**DB?** Yes — queries `UserProblem`.

---

### 4.4 Interleaved session API (`/api/study/session`)

**What it does:** Returns a combined queue of due problems + never-seen problems, interleaved by topic. Explicitly rejects topic-filtering requests (to enforce interleaving). Logs an `INTERLEAVED_PRACTICE` analytics event.

**Files:**
- `src/app/api/study/session/route.ts`
- `src/lib/learning/interleaving.ts`

**Status:** ✅ Fully built

**DB?** Yes — queries `UserProblem`, `Problem`; writes `LearningAnalytics`.

---

## 5. AI Tutor (`/chat`)

### 5.1 Chat session list

**What it does:** Left sidebar lists all previous chat sessions (title + date). Sessions are loaded from `GET /api/chat/sessions`. Clicking a session loads its messages.

**Files:**
- `src/app/(app)/chat/page.tsx`
- `src/app/api/chat/sessions/route.ts`

**Status:** ✅ Fully built

**DB?** Yes — queries `ChatSession`.

---

### 5.2 New chat creation

**What it does:** "New Chat" button clears the interface and opens a fresh session. On first message, a new `ChatSession` is created with an AI-generated title (short Groq inference).

**Files:**
- `src/app/(app)/chat/page.tsx` — `handleNewChat()`
- `src/app/api/chat/route.ts` — `generateTitle()`

**Status:** ✅ Fully built

**DB?** Yes — creates `ChatSession` + `ChatMessage`.

---

### 5.3 Freeform AI math chat

**What it does:** Streaming chat with Groq `llama-3.3-70b-versatile`. Uses a math-assistant system prompt. LaTeX is rendered inline using `MathRenderer`. Enforces per-day chat message and session limits by plan (10 messages/day free, 120 pro, 600 max). Usage is tracked in `UsageEvent` table via Supabase admin client. On limit, returns a `429` with an upgrade URL.

**Files:**
- `src/components/ChatInterface.tsx`
- `src/app/api/chat/route.ts`
- `src/lib/billing/usage.ts` — `consumeUsage()`

**Status:** ✅ Fully built

**DB?** Yes — writes `ChatMessage`; reads/writes `UsageEvent`.

---

### 5.4 Problem-scoped chat

**What it does:** When `ChatInterface` is rendered on the practice page with a `problemId`, the system prompt is enriched with the problem body and solution. It enforces "no spoilers before an attempt" logic — if the user hasn't attempted the problem yet, the AI refuses to reveal the full solution.

**Files:**
- `src/app/api/chat/route.ts` — problem-scoped branch
- `src/app/(app)/study/[problemId]/page.tsx` — embeds `<ChatInterface problemId={...}>`

**Status:** ✅ Fully built

**DB?** Yes — reads `Problem`, `UserProblem`, `ProblemAttempt`.

---

### 5.5 Usage display in chat sidebar

**What it does:** Shows current plan badge and "Chat usage: X/Y" in the chat sidebar header. Free users see an "Unlock higher limits" link.

**Files:**
- `src/app/(app)/chat/page.tsx` — `fetchUsage()`, usage display block
- `src/app/api/billing/usage/route.ts`

**Status:** ✅ Fully built

**DB?** Yes — reads `UsageEvent` via `getUsageSummary()`.

---

## 6. Reflections (`/reflections`)

### 6.1 Reflection history list

**What it does:** Fetches the user's 200 most recent reflections (from the `Reflection` table), grouped by problem. Each card shows the elaboration prompt, the user's typed response, the originating problem title + topic, timestamp, and a "Retry Problem" link.

**Files:**
- `src/app/(app)/reflections/page.tsx`
- `src/app/api/reflections/route.ts` — `GET`

**Status:** ✅ Fully built

**DB?** Yes — queries `Reflection` (joined to `Problem`, `Topic`).

---

### 6.2 Reflection creation (via practice page)

**What it does:** When the user answers a problem correctly and elaborative interrogation is enabled, an AI-generated follow-up question appears in the practice UI. The user types a response and clicks "Save Reflection", which calls `POST /api/reflections`.

**Files:**
- `src/app/(app)/study/[problemId]/page.tsx` — reflection block, `handleSaveReflection()`
- `src/app/api/reflections/route.ts` — `POST`
- `src/lib/learning/aiClassifiers.ts` — `generateElaborationPrompt()`

**Status:** ✅ Fully built

**DB?** Yes — writes `Reflection`.

---

## 7. Error Log (`/error-log`)

### 7.1 This-week error summary

**What it does:** Shows a single-line summary card identifying the user's most common error type this week (e.g. "Your most common error is algebraic slip (4 attempts)"). Uses `groupBy` on `ProblemAttempt.errorType` for the past 7 days.

**Files:**
- `src/app/(app)/error-log/page.tsx`

**Status:** ✅ Fully built

**DB?** Yes — `ProblemAttempt.groupBy` by `errorType`, filtered to last 7 days.

---

### 7.2 Mistake history list

**What it does:** Lists the 150 most recent incorrect attempts, each showing problem title, topic, error type label (formatted from the enum), AI explanation, date, and a "Re-attempt" button.

**Files:**
- `src/app/(app)/error-log/page.tsx`

**Status:** ✅ Fully built

**DB?** Yes — queries `ProblemAttempt` (isCorrect: false, joined to `Problem`, `Topic`).

---

### 7.3 `GET /api/errors/log`

**What it does:** Server-side version of the error log query (used by the analytics service, not directly by the error-log page which is server-rendered). Returns attempts + a weekly summary with up to 3 targeted problem suggestions.

**Files:**
- `src/app/api/errors/log/route.ts`

**Status:** ⚠️ Partially built — the "targeted problems" feature returns 3 problems from the DB but they are **not filtered by error type** (the `where` clause for topic matching is missing). Any 3 problems come back regardless of relevance.

**DB?** Yes — queries `ProblemAttempt`, `Problem`.

---

## 8. Analytics (`/analytics`)

### 8.1 Key metrics row (always visible)

**What it does:** Four cards: Overall Accuracy (first-try correct rate), Mastered %, Current Streak, and Total Tracked Problems. All data comes from `GET /api/dashboard/stats`. Visible to all plans.

**Files:**
- `src/app/(app)/analytics/page.tsx`
- `src/app/api/dashboard/stats/route.ts`

**Status:** ✅ Fully built

**DB?** Yes — queries `UserProblem`, `ProblemAttempt` (grouped).

---

### 8.2 Focus Areas & Strong Areas cards (PRO/MAX only)

**What it does:** Two additional detail cards below the metrics row — "Focus Areas" shows the top error type, and "Strong Areas" shows mastery percentage + a progress bar. For free users, these cards are rendered but overlaid with a `backdrop-blur` paywall with an "Upgrade to Pro →" CTA.

**Files:**
- `src/app/(app)/analytics/page.tsx` — paywalled detail section
- `src/app/api/dashboard/stats/route.ts` — `ensureFeatureAccess("analytics")` gate

**Status:** ⚠️ Partially built — the data backing these cards is real (`topErrorType`, `masteryPercentage`), but the analytics depth is shallow. There is no per-topic breakdown, no time-series chart, no retention curve, and no weekly trend comparison. The "Strong Areas" card only echoes mastery percentage.

**DB?** Yes — queries `ProblemAttempt`, `UserProblem`.

---

### 8.3 Analytics service (`AnalyticsService`)

**What it does:** A class that wraps the `LearningAnalytics` table. Used internally to upsert JSON aggregates keyed by `(userId, sessionKey, LearningMethod)`.

**Files:**
- `src/lib/analytics/AnalyticsService.ts`
- `src/lib/learning/analytics.ts` — `upsertLearningAnalytics()`

**Status:** ✅ Fully built — writes are happening on every attempt, review, and session. However, **no UI reads from this table** — the `LearningAnalytics` data is never surfaced to users. It is purely write-side infrastructure with no frontend consumption yet.

**DB?** Yes — writes `LearningAnalytics`.

---

## 9. Settings (`/settings`)

### 9.1 Account info display

**What it does:** Shows email, current plan badge with upgrade link (for free users), and member-since date. Read-only.

**Files:**
- `src/app/(app)/settings/page.tsx`

**Status:** ✅ Fully built

**DB?** Yes — reads `User` via `getOrCreateUserForSupabaseId()`.

---

### 9.2 Profile edit form

**What it does:** Editable fields for Display Name, Education Level/Grade, Course/Field of Study, and Age. Submits to `POST /api/user/profile`. On success shows "Settings saved successfully."

**Files:**
- `src/app/(app)/settings/SettingsForm.tsx`
- `src/app/api/user/profile/route.ts`

**Status:** ✅ Fully built

**DB?** Yes — updates `User` (name, grade, course, age).

---

## Cross-cutting Features (not nav-item specific)

### Authentication

**What it does:** Email/password sign-in and Google OAuth via Supabase Auth. Auth callback at `/auth/callback/route.ts`. Registration at `/register`.

**Files:**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/middleware.ts`

**Status:** ✅ Fully built

**DB?** Yes — reads/writes Supabase Auth + `profiles` table (Supabase, not Prisma).

---

### Onboarding flow

**What it does:** Multi-step wizard that collects course, grade/year, primary learning challenge, and referral source. Animated step transitions. On completion, calls `POST /api/user/onboarding` which upserts a `profiles` row and sets `onboarding_completed = true`. The app layout redirects incomplete users back to `/onboarding` on every request.

**Files:**
- `src/app/onboarding/page.tsx` — full wizard UI
- `src/app/api/user/onboarding/route.ts`
- `src/app/(app)/layout.tsx` — redirect guard

**Status:** ✅ Fully built

**DB?** Yes — upserts Supabase `profiles` table.

---

### Billing & subscription management (Paddle)

**What it does:** Three-tier plan system (FREE / PRO / MAX) backed by Paddle. Pricing page renders plan cards. "Subscribe" creates a Paddle checkout session. Webhook endpoint handles `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`, and `transaction.payment_failed` events to keep plan/status in sync. Daily usage limits enforced per-plan.

**Files:**
- `src/app/pricing/page.tsx`
- `src/components/PricingCards.tsx`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/webhook/route.ts`
- `src/app/api/billing/plans/route.ts`
- `src/app/api/billing/usage/route.ts`
- `src/app/api/billing/change-plan/route.ts`
- `src/lib/billing/plans.ts`
- `src/lib/billing/usage.ts`
- `src/lib/billing/subscriptions.ts`
- `src/lib/payments/paddle.ts`

**Status:** ✅ Fully built — the billing infrastructure is complete. Usage enforcement is live on chat, problem starts, and material summaries.

**DB?** Yes — reads/writes `profiles` (Supabase) and `UsageEvent` (Prisma).

---

### Feature flags

**What it does:** Six learning feature flags (`spaced_repetition`, `retrieval_practice`, `interleaved_practice`, `elaborative_interrogation`, `worked_example_study`, `error_analysis`) stored in the `FeatureFlag` table. All default to `true` if no DB row exists. Gate checks happen inside each API route before executing learning logic.

**Files:**
- `src/lib/learning/featureFlags.ts`
- `src/app/api/learning/flags/route.ts`

**Status:** ✅ Fully built — read path is used. No admin UI exists to toggle them (must be done in the database directly).

**DB?** Yes — reads `FeatureFlag`.

---

### Math rendering (`MathRenderer`)

**What it does:** Renders LaTeX strings embedded in text using `katex` (inline `$...$`) and `$$...$$` display math. Used on the practice page for problem body and solution, and inside chat messages.

**Files:**
- `src/components/MathRenderer.tsx`

**Status:** ✅ Fully built

**DB?** No — pure rendering utility.

---

### Cron reminder (`/api/cron/reminders`)

**What it does:** Secured cron endpoint (Bearer token checked against `CRON_SECRET`). Intended to send email reminders to users with due problems.

**Files:**
- `src/app/api/cron/reminders/route.ts`
- `src/lib/email/resend.ts`

**Status:** 🚧 Stub — the handler returns `{ success: true, count: 0 }` without doing anything. `src/lib/email/resend.ts` exists but the cron logic that would query due users and send emails has not been written.

**DB?** No (currently). Intended: would query `UserProblem`.

---

### Referral system

**What it does:** Schema has a `Referral` model and `User.referredById` + `referrals` relation. `User` also has `referralCode`, `referralPromptedAt`, and `proUntil` fields.

**Files:**
- `prisma/schema.prisma` — `Referral` model, referral fields on `User`

**Status:** 🚧 Stub — no API routes, no UI, no referral code generation logic, no reward granting logic. The schema is defined but entirely unused at the application layer.

**DB?** Schema exists, never written to by app code.

---

## Dead Weight

Features with no real implementation — only shells, empty states, or schema artifacts.

| Feature | Location | Issue |
|---|---|---|
| **Cron email reminders** | `src/app/api/cron/reminders/route.ts` | Handler body is a no-op; always returns `count: 0`. `resend.ts` is imported elsewhere but reminder logic is not written. |
| **Referral system** | `prisma/schema.prisma` (`Referral` model, `referralCode`, `proUntil`, `referralPromptedAt` on `User`) | Zero API routes, zero UI. Schema exists; no application code touches it. |
| **YouTube summarisation** | `src/app/api/materials/route.ts` | Returns a static fallback: "Automatic summarisation of YouTube videos is not currently available." No transcript extraction is implemented. |
| **Image summarisation** | `src/app/api/materials/route.ts` | Returns a static fallback: "Automatic summarisation of images is not currently available." No OCR or vision model is called. |
| **Targeted problems in Error Log API** | `src/app/api/errors/log/route.ts` | Fetches 3 random problems and labels them "targeted" but applies no filter by error type or topic. The suggestions are meaningless. |
| **LearningAnalytics data (read side)** | `src/lib/analytics/AnalyticsService.ts`, `LearningAnalytics` table | Analytics events are written on every attempt/review/session but **never read back** to any UI. The `LearningAnalytics` table is write-only from the user's perspective. |
| **`proUntil` field** | `User.proUntil` in Prisma schema | Presumably for a time-limited free-Pro grant (referral reward?). No code reads or writes this field. |
| **`earlyAccess` plan flag** | `src/lib/billing/plans.ts` | Defined in `PlanLimits` for `max` tier. No UI or feature gate checks this flag anywhere in the app. |
| **`priorityResponses` plan flag** | `src/lib/billing/plans.ts` | Defined for `max` tier. Groq `max_tokens` is set to 4096 for `max` vs 3000 for others, which is minimal. No routing to a separate queue or model. |
| **Feature flag admin UI** | `src/app/api/learning/flags/route.ts` | Flags can be read via API but there is no UI or admin panel to toggle them. They must be changed directly in the database. |

---

## Summary Table

| Nav Item | Fully Built | Partially Built | Stub / Dead Weight |
|---|---|---|---|
| **Dashboard** | Greeting, stats, recent summaries, quick links, due-nudge | Note/PDF upload+AI summary | YouTube & image summarisation |
| **Notebooks** | Notebook CRUD, text ingestion, document list | PDF ingestion (simple PDFs only), non-LLM summary+concepts | — |
| **Topics** | Topic tree, topic detail, problem cards, progress bar | — | — |
| **Review** | Review queue, interleaved ordering, stats | — | — |
| **Study (problem)** | Practice page, SM-2, retrieval, error analysis, elaboration, worked-example, auto-advance, context chat | — | — |
| **AI Tutor** | Freeform + problem-scoped chat, session history, usage display | — | — |
| **Reflections** | Reflection creation (via practice), history list | — | — |
| **Error Log** | Mistake history, week summary | Targeted problem suggestions (unfiltered) | — |
| **Analytics** | Key metrics row, paywalled detail cards | Shallow depth (no charts, no per-topic breakdown) | LearningAnalytics table (never read) |
| **Settings** | Account display, profile edit | — | — |
| **Cross-cutting** | Auth, onboarding, billing/Paddle, feature flags, MathRenderer | — | Cron reminders, referral system, proUntil, earlyAccess flag |
