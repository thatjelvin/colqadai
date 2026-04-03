# User Journey Audit (Code-Only)

Date: 2026-04-03  
Scope: Full walkthrough from first landing through all visible product features, based strictly on implementation in this codebase (pages, API routes, and Prisma schema).

---

## Phase 1: First Landing and Plan Discovery

### 1. Marketing Landing
The user lands on a public homepage with product messaging, feature highlights, topic previews, and calls to action (Sign in, Get started, Pricing). The page is static marketing UI and does not persist data.

What user does next: chooses Pricing, Register, or Login.

### 2. Pricing Discovery
The user can open Pricing and view Free/Pro/Max cards. If authenticated, usage counters are shown from backend usage tracking. Upgrade starts checkout flow; downgrade to Free is available via authenticated API.

What system does: reads usage, plan, and limits; can create Paddle checkout sessions.

What happens next: user returns with updated entitlements after webhook processing.

---

## Phase 2: Auth

### 1. Register (Email/Password)
The user fills name/email/password and submits. Frontend validates input, backend validates again, hashes password, and writes a new user row.

What system does next: attempts automatic credential sign-in and redirects.

Flag: redirect target uses /app/dashboard while route group does not expose /app prefix [PARTIAL].

### 2. Login (Credentials/Google)
The user signs in with email/password or Google OAuth. Backend credentials auth checks password hash; OAuth relies on provider config.

What system does: creates JWT session and injects user id + billing fields into token/session.

Flag: successful auth redirects to /app/dashboard (same route mismatch issue) [PARTIAL].

### 3. Session/Billing Context
Once authenticated, session includes plan and subscription status. App layout enforces login and onboarding completion before core pages.

What happens next: user without profile fields is redirected to onboarding.

---

## Phase 3: Onboarding

### 1. Profile Setup Form
The user enters grade, course, age, and referral source. Submit triggers POST to onboarding API.

What system does: validates payload and persists fields on User.

What happens next: frontend navigates to dashboard route.

### 2. Access Control
Onboarding write requires auth; unauthorized requests return 401.

Flag: onboarding page can render client-side even if unauthenticated, but save will fail [PARTIAL].

---

## Phase 4: Core Study Loop (Spaced Repetition)

### 1. Dashboard
The user sees due items, recent topics, streak, and mastery stats. Data is computed from UserProblem records and related Problem/Topic relations.

What user does: starts review or navigates topics.

### 2. Topics Overview
The user sees hierarchical topics and progress percentages. Backend reads top-level topics, children, problems, and user progress.

Flag: seed script inserts no default topics/problems, so new installs can appear empty [PARTIAL].

### 3. Topic Detail
The user sees problem list, progress bar, subtopics, and a Start Studying CTA. System selects next candidate problem (due first, else new).

What happens next: user opens a problem study session.

### 4. Review Queue (/study)
The user sees due today, overdue counts, estimated time, and queue items. Data is fully backed by UserProblem scheduling state.

What happens next: user opens one problem for active practice.

### 5. Problem Study Session (/study/[problemId])
The user sees problem statement, timer, solution reveal, self-rating controls, and AI tutor panel. Entering page calls start endpoint: creates UserProblem if missing; existing records are reused.

What user does: reveals solution and rates recall (Again/Hard/Good/Easy mapped to SM-2 ratings).

What system does: updates ease factor, interval, repetitions, nextReviewAt, lastReviewedAt, and status.

What happens next: navigates to next due problem or dashboard.

---

## Phase 5: AI Chat

### 1. Problem-Scoped Tutor Chat
Inside study, user asks for hints/explanations. Backend enforces usage limits, creates/reuses chat session, stores both user and assistant messages, and streams model response.

What system does: builds system prompt with problem context and solution constraints.

What happens next: continued contextual tutoring in same persisted session.

### 2. Freeform Chat Page
User opens chat workspace with left sidebar history and main chat area. Sessions list is loaded from backend (freeform sessions only), usage badge is shown.

Flag: selecting an existing session id is wired in UI, but historical messages are not fetched into the chat panel [PARTIAL].

### 3. Quota Enforcement
Usage limits are tracked in DB by daily bucket; middleware also applies Redis-based per-day counting.

Flag: middleware applies to /api/chat paths broadly and can count non-message requests (e.g., sessions list) toward limits [PARTIAL].

---

## Phase 6: Secondary Features

### 1. Analytics Screen
User sees metrics, weak areas, and strong areas visualized.

Flag: page uses hardcoded mock data only and does not consume analytics API [UI ONLY — not persisted].

Flag: backend analytics endpoint exists separately, so UI/backend are disconnected [PARTIAL].

### 2. Notebooks Screen
User sees notebook cards, create panel, delete menu, and open actions.

Flag: entire notebooks list is mock array; create/delete/open have no backing DB/API; notebook detail routes are missing [UI ONLY — not persisted].

### 3. Billing + Subscriptions
User can view usage, upgrade via checkout, and downgrade to Free. Webhook updates plan/status fields and supports several subscription/transaction events.

What happens next: plan gates affect premium features (analytics/notebooks).

### 4. Reminder Emails (Cron)
System can query users with due reviews and send batched email reminders via Resend.

Flag: cron auth guard is commented out, so endpoint hardening is incomplete [PARTIAL].

---

## Phase 7: Navigation, Settings, and Account Surface

### 1. Sidebar + Sign Out
User sees nav entries (Dashboard, Notebooks, Topics, Review, Analytics, Settings), identity badge, and Sign Out. Sign Out is functional.

### 2. Settings
Flag: Settings is visible in nav but no settings page route exists [PARTIAL].

### 3. Route Prefix Consistency
Flag: multiple components and auth redirects use /app/* paths while route groups produce non-prefixed paths, creating broken transitions [PARTIAL].

---

## API + Data Coverage Summary

### Auth and onboarding
- Implemented: register, next-auth route, onboarding POST.
- Persisted: User + auth/session/account tables.

### Study and spaced repetition
- Implemented: problem fetch, start problem, submit review, due list.
- Persisted: UserProblem with SM-2 state transitions.

### Chat
- Implemented: message send, stream response, session list, DB persistence.
- Persisted: ChatSession and ChatMessage.
- Gaps: chat history hydrate on session select [PARTIAL].

### Billing
- Implemented: plans metadata, usage summary, checkout, change-plan (to free), webhook handlers, usage event accounting.
- Persisted: plan/subscription fields on User + UsageEvent counters.

### Notebooks/documents
- Missing backend model/routes and detail pages.
- Current visible UX is mock-only [UI ONLY — not persisted].

### Analytics
- Backend stats endpoint exists.
- Page itself is mock-only and not connected [UI ONLY — not persisted] [PARTIAL].

---

## End-to-End Gaps (Visible but Not Fully Functional)

1. Auth success redirects target /app/dashboard even though the active route structure is non-prefixed [PARTIAL].
2. Multiple in-app links point to /app/topics and /app/study paths, causing navigation breaks [PARTIAL].
3. Settings appears in sidebar but has no page route [PARTIAL].
4. Analytics page is mock-data UI only [UI ONLY — not persisted].
5. Notebooks page is mock-data UI only, with no persistence layer or notebook detail route [UI ONLY — not persisted].
6. Chat session selection does not load historical messages into active panel [PARTIAL].
7. Middleware rate limiting can consume quota on non-message chat requests [PARTIAL].
8. Fresh environment has no seeded topics/problems, so core loop can be empty [PARTIAL].
9. Reminder cron endpoint lacks active auth guard [PARTIAL].

---

## Notes
- This audit follows implemented code paths only (pages, API routes, Prisma schema, supporting services/components).
- No PRD or documentation assumptions were used.