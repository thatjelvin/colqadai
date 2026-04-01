# UI Design Specification: Colqad (Codebase + PRD Aligned)

This specification reverse-engineers current implementation and defines the UI needed to close PRD gaps without inventing out-of-scope product behavior.

Source anchors:
- PRD: PRD.md
- App routes/layouts: src/app
- Core learning logic: src/lib/sm2.ts
- Data model: prisma/schema.prisma

## 1. Design Philosophy

1. Minimal, premium, math-focused.
2. Distraction-free learning over feature clutter.
3. Cognitive efficiency first:
- single primary action per screen
- progressive disclosure (problem first, then solution, then review)
- stable layout zones to reduce context switching
4. Math-native readability:
- strong typographic hierarchy for theorem/problem/solution
- reliable inline and display formula rendering
5. Trust through clarity:
- every state transition should be explicit (loading, success, error, next step)

## 2. Design System

### 2.1 Color System

Target visual direction (black + beige base), mapped to existing CSS variables in src/app/globals.css:

- Base
- background: warm beige (#F5F1E8)
- foreground: near-black (#111111)
- card: soft ivory (#FBF8F2)
- border: warm gray (#D8D0C2)

- Functional
- primary action: black (#111111), text white (#FAFAFA)
- success: moss green (#2E7D57)
- warning: amber (#C78A2C)
- error: muted red (#B24747)
- info: slate blue-gray (#5B6B7A)

- Learning state colors
- NEW: outline neutral
- LEARNING: amber/secondary
- REVIEW: primary
- MASTERED: success

Current implementation status:
- Existing palette is default shadcn slate tokens in src/app/globals.css, not yet black+beige.

### 2.2 Typography

- Primary font: Geist Sans from src/app/layout.tsx
- Math text: KaTeX output from src/components/MathRenderer.tsx
- Type scale:
- Page title: 32/40 semibold
- Section title: 20/28 semibold
- Body: 16/24 regular
- Supporting/meta: 14/20 regular
- Formula blocks: preserve generous vertical rhythm (16-20 spacing)

### 2.3 Core Components (implementation-ready)

Buttons
- Source: src/components/ui/button.tsx
- Purpose: primary actions, progression, submission.
- Variants: default, destructive, outline, secondary, ghost, link.
- States: default, hover, focus-visible ring, disabled, loading (inline spinner pattern used in auth pages).

Inputs
- Source: src/components/ui/input.tsx
- Purpose: auth, onboarding, chat input.
- States: default, focus-visible, disabled, error (pattern used at form level in auth screens).

Cards
- Source: src/components/ui/card.tsx
- Purpose: content grouping, stat blocks, problem blocks, chat shells.
- States: default, hover (where clickable), selected (chat session list uses selected row background state in page-level list, not card primitive).

Badges
- Source: src/components/ui/badge.tsx
- Purpose: difficulty/status metadata.
- Variants used: default, secondary, destructive, outline.
- States: default, hover tint changes.

Progress
- Source: src/components/ui/progress.tsx
- Purpose: topic mastery.
- States: normal, 0%, 100%.

Navigation
- Source: src/components/Sidebar.tsx
- Purpose: primary app nav + account menu.
- States: active route, hover route, dropdown open.

Feedback indicators
- Loading: inline spinner or animated dots.
- Error: inline text blocks in auth pages; console-only in some pages (needs standardization).
- Success: currently mostly redirect-based, minimal explicit confirmation.

Math Input System (critical, currently missing)
- Current: no answer input field exists in study flow; user self-rates after optionally viewing solution in src/app/(app)/study/[problemId]/page.tsx.
- Required spec for PRD alignment:
- Component: MathAnswerInput
- Modes: expression, multi-line derivation, short text concept answer
- Validation states: empty, syntax-invalid, parseable, submitted
- Helpers: LaTeX preview toggle, symbolic equivalence hint state, step-entry mode
- Actions: Submit answer, Save draft, Reveal hint, Reveal solution (after attempt)
- This component is required to support PRD answer checking and mistake taxonomy.

## 3. Page Inventory (From Codebase)

### 3.1 Route/Layout Inventory

| Route path (actual Next route) | File | Purpose | Status |
|---|---|---|---|
| / | src/app/page.tsx | Landing/marketing entry | Fully implemented |
| /login | src/app/(auth)/login/page.tsx | Sign in | Fully implemented |
| /register | src/app/(auth)/register/page.tsx | Sign up | Fully implemented |
| /onboarding | src/app/onboarding/page.tsx | Profile onboarding | Partially implemented |
| /dashboard | src/app/(app)/dashboard/page.tsx | Learning home/stats/due work | Partially implemented |
| /topics | src/app/(app)/topics/page.tsx | Topic hierarchy | Partially implemented |
| /topics/[slug] | src/app/(app)/topics/[slug]/page.tsx | Topic detail/problems | Partially implemented |
| /study/[problemId] | src/app/(app)/study/[problemId]/page.tsx | Practice/review session | Partially implemented |
| /chat | src/app/(app)/chat/page.tsx | Freeform AI chat | Partially implemented |
| Root layout | src/app/layout.tsx | Fonts/session provider | Fully implemented |
| Protected app layout | src/app/(app)/layout.tsx | Auth + onboarding gate + sidebar shell | Partially implemented |

Important implementation mismatch:
- The app uses route groups (folder names in parentheses), so the URL is /dashboard, /topics, /study, /chat.
- Multiple links/pushes target /app/... instead, causing navigation inconsistencies, for example src/app/onboarding/page.tsx, src/components/Sidebar.tsx, and auth redirects in src/app/(auth)/login/page.tsx and src/app/(auth)/register/page.tsx.

### 3.2 API Endpoints Affecting UI

| Endpoint | File | UI dependency |
|---|---|---|
| POST /api/auth/register | src/app/api/auth/register/route.ts | Register form |
| NextAuth handler | src/app/api/auth/[...nextauth]/route.ts | Login session |
| POST /api/user/onboarding | src/app/api/user/onboarding/route.ts | Onboarding submit |
| GET /api/problems/[id] | src/app/api/problems/[id]/route.ts | Study problem fetch |
| POST /api/problems/[id]/start | src/app/api/problems/[id]/start/route.ts | Study session start |
| POST /api/problems/[id]/review | src/app/api/problems/[id]/review/route.ts | Review submission |
| GET /api/problems/due | src/app/api/problems/due/route.ts | Due queue |
| POST /api/chat | src/app/api/chat/route.ts | Tutor/freeform chat |
| GET /api/chat/sessions | src/app/api/chat/sessions/route.ts | Chat history list |
| GET /api/topics | src/app/api/topics/route.ts | Available but unused by current pages |
| GET /api/dashboard/stats | src/app/api/dashboard/stats/route.ts | Available but unused by current pages |

## 4. Page-Level UI Specifications

### 4.1 Landing (/)
A. Purpose
- Product value communication and conversion to auth.

B. Layout Structure
- Header, hero, feature cards, topic preview, CTA, footer.

C. Components Used
- Button, static cards, iconography.

D. Interaction Logic
- Primary CTA to register, secondary CTA to login.

E. Data & State Dependencies
- None (static).

### 4.2 Login (/login)
A. Purpose
- Authenticate via Google or credentials.

B. Layout Structure
- Centered auth card with social then form.

C. Components Used
- Card, Input, Label, Button, Separator.

D. Interaction Logic
- Credentials signIn redirect to dashboard route target currently /app/dashboard.
- Google callback currently /app/dashboard.

E. Data & State Dependencies
- Local state: email, password, loading, error.
- NextAuth signIn.

### 4.3 Register (/register)
A. Purpose
- Create account and auto-login.

B. Layout Structure
- Same visual shell as login.

C. Components Used
- Card system + input stack + inline validation.

D. Interaction Logic
- Client Zod validation then POST register then signIn credentials.
- Google signIn supported.

E. Data & State Dependencies
- Form state, field errors, server error, loading.

### 4.4 Onboarding (/onboarding)
A. Purpose
- Collect learning profile.

B. Layout Structure
- Single centered card form.

C. Components Used
- Card, Input, Label, Button.

D. Interaction Logic
- Submit posts grade/course/age/source.
- Redirect target currently /dashboard (correct for grouped routes).

E. Data & State Dependencies
- Required in UI: grade, course, age.
- Gate check in protected layout only verifies grade presence in src/app/(app)/layout.tsx, so completion fidelity is weak.

### 4.5 Protected Shell (applies to /dashboard, /topics, /study, /chat)
A. Purpose
- Persistent navigation and account controls.

B. Layout Structure
- Left fixed sidebar + right scrollable main panel.

C. Components Used
- Sidebar nav links, dropdown sign out.

D. Interaction Logic
- Route highlighting via pathname.
- Sign out callback to root.

E. Data & State Dependencies
- Requires session user object.
- Protected layout redirects unauthenticated users.

### 4.6 Dashboard (/dashboard)
A. Purpose
- Daily entry point for due work, progress snapshot, recent topics.

B. Layout Structure
- Welcome header, 3-stat row, main two-column content.

C. Components Used
- StatsRow, ProblemCard, Card, Button.

D. Interaction Logic
- Start review button navigates to first due problem.
- Empty due state suggests browse topics.

E. Data & State Dependencies
- Server data: due problems, all userProblems, recent topics.
- Derived values: mastery %, streak.
- Streak implementation is date-consecutive review history.

### 4.7 Topics Index (/topics)
A. Purpose
- Browse conceptual tree and progress.

B. Layout Structure
- Header + bordered topic tree panel.

C. Components Used
- TopicTree, Progress bars.

D. Interaction Logic
- Expand/collapse topic nodes.
- Topic click navigates to detail.

E. Data & State Dependencies
- Server fetch for top-level topics + children + progress mapping.

### 4.8 Topic Detail (/topics/[slug])
A. Purpose
- Problem list for one topic with progress and next action.

B. Layout Structure
- Back row + title/description + progress bar + problem list + subtopics.

C. Components Used
- ProblemCard, Button, Badge, basic progress fill.

D. Interaction Logic
- Computes next problem as first due else first unseen.
- Start Studying CTA to study route.

E. Data & State Dependencies
- Topic with problems + child problems + user progression map.

### 4.9 Study Session (/study/[problemId])
A. Purpose
- Core learning loop: consume problem, reveal solution, rate recall, continue.

B. Layout Structure
- Header with topic and difficulty.
- Two-panel desktop grid:
- left: problem/solution/rating
- right: AI tutor chat

C. Components Used
- MathRenderer, Switch, Badge, Card, ChatInterface, rating buttons.

D. Interaction Logic
- On mount: fetch problem + start problem record.
- User toggles solution visibility.
- Rating buttons (0,1,3,5) submit review and navigate to next due item or dashboard.

E. Data & State Dependencies
- Local state: problem, showSolution, loading, submitting, startTime.
- API dependencies: get problem, start, review, due list.

### 4.10 Chat (/chat)
A. Purpose
- Freeform math assistant with session history.

B. Layout Structure
- Left session list sidebar + right chat panel.

C. Components Used
- ChatInterface, ScrollArea, Button.

D. Interaction Logic
- Load sessions on mount.
- Select session.
- New chat resets selected session.

E. Data & State Dependencies
- API sessions list (freeform only).
- Chat streaming from /api/chat.

## 5. Practice Session (Critical System)

### 5.1 Current Implementation (actual behavior)

Problem loading
1. User enters study route.
2. Client calls GET problem endpoint.
3. Client calls start endpoint to ensure UserProblem record exists.
4. Record defaults: EF 2.5, interval 1, repetitions 0, status LEARNING.

Answer submission model
- No answer entry/submission.
- User self-evaluates after optionally viewing full solution.
- Ratings exposed only when solution is shown.

Feedback mechanism
- Immediate transition only.
- No mistake classification UI.
- No step-level correction UI.
- No weak-area tagging UI.

Transition logic
- Submit review to SM-2 endpoint with rating and timeTaken.
- Then fetch due queue and route to next due item; else dashboard.

Spaced repetition integration
- SM-2 adaptation in src/lib/sm2.ts:
- fail (<3) resets interval to 1 day, repetitions 0
- success intervals 1, 6, then EF-multiplied
- rating >3 with >180s time gets one-point penalty

### 5.2 PRD Gap and Required UI Extension

To satisfy PRD practice intent while preserving current architecture, add this UI contract:

1. Pre-answer phase
- MathAnswerInput visible before solution.
- Optional Hint button.
- Submit Attempt button required for progression.

2. Evaluation phase
- Show correctness state (correct/incorrect/partial).
- If incorrect, classify error type label (conceptual/procedural/omission/domain/notation).

3. Explanation phase
- Step-by-step solution panel with labeled rules.
- Compare view: student attempt vs canonical steps.

4. Scheduling phase
- Keep current rating UI, but make rating secondary to attempt outcome.
- Show "Next review in X days" preview after submit.

5. Session phase
- Progress header: Problem i of N, accuracy, time.
- End-of-session summary card.

This can be implemented incrementally without replacing current SM-2 storage model in prisma/schema.prisma.

## 6. UX Flows (Code + PRD Merged)

### 6.1 Onboarding to First Session

1. User lands on /register and creates account.
2. Auto sign-in triggers redirect (currently coded to /app/dashboard; should resolve to actual dashboard route).
3. Protected layout checks profile; if grade missing, sends user to onboarding.
4. User submits onboarding form.
5. User lands on dashboard and starts first due/new problem.
6. First study screen opens with problem + AI tutor panel.

Pages/components:
- Register page
- Protected layout gate
- Onboarding page
- Dashboard page
- Study page

### 6.2 Practice to Mistake to Review

1. User opens study problem.
2. User attempts mentally (current) or via MathAnswerInput (required PRD extension).
3. User reveals solution.
4. User rates recall.
5. Review API updates schedule and status.
6. App routes to next due problem or dashboard.

Pages/components:
- Study page
- MathRenderer
- Rating controls
- Review API

### 6.3 Review to Spaced Repetition

1. Dashboard shows due work.
2. User starts review session from first due card.
3. Each rating updates nextReviewAt via SM-2.
4. Status transitions NEW/LEARNING/REVIEW/MASTERED based on repetitions.

Pages/components:
- Dashboard due section
- ProblemCard
- Study flow
- SM-2 logic

### 6.4 Progress Tracking

1. User opens dashboard.
2. Stats computed from UserProblem records.
3. Topic progress visualized in topics tree and topic detail bars.
4. User uses recent topics shortcuts to continue context.

Pages/components:
- Dashboard + StatsRow
- Topics + TopicTree
- Topic detail progress strip

## 7. Gaps and Improvements

### 7.1 High-impact gaps

1. Route architecture mismatch:
- Many links use /app/... while route-group pages resolve to /dashboard, /topics, /study, /chat.
- Affects nav, auth redirects, study transitions, and middleware matcher coverage.
- References: src/components/Sidebar.tsx, src/app/(auth)/login/page.tsx, src/app/(auth)/register/page.tsx, middleware.ts.

2. Practice UX does not capture answers:
- No student input, no correctness check, no mistake detection UI.
- PRD requires active recall with submitted answer evaluation.

3. PRD core modules missing in UI:
- Notebook system and notebook-centric navigation.
- Document upload/processing flow.
- Concept extraction surfaced as module/notebook context.
- Knowledge graph visualization.
- Web research mode.
- These are defined in PRD.md but absent from route inventory in src/app.

4. Difficulty model mismatch:
- PRD defines easy/medium/hard/challenge; implementation has EASY/MEDIUM/HARD only in prisma/schema.prisma.

### 7.2 Medium gaps

1. Onboarding completion criteria mismatch:
- UI requires several fields, but gate only checks grade.
- Reference: src/app/(app)/layout.tsx.

2. Inconsistent progress architecture:
- Dashboard and Topics pages compute stats server-side directly, while parallel API routes exist but are unused.
- References: src/app/(app)/dashboard/page.tsx, src/app/api/dashboard/stats/route.ts, src/app/(app)/topics/page.tsx, src/app/api/topics/route.ts.

3. Chat history scope limitation:
- Session list shows only freeform chats (problemId null), so problem-scoped tutoring conversations are not discoverable from chat workspace.
- Reference: src/app/api/chat/sessions/route.ts.

4. Error/empty-state consistency:
- Some pages rely on console errors and silent failure without user-visible recovery patterns.

### 7.3 Low gaps

1. Theme direction mismatch:
- Current neutral slate style does not yet express intended black+beige premium system.
2. Accessibility polish:
- Need consistent success/error announcements and keyboard shortcuts in study/chat workflows.
3. Session analytics UI:
- Weak-area and time-spent visualizations from PRD are not surfaced.

## 8. Constraints for Implementation

1. Do not invent net-new product surfaces beyond PRD.
2. Preserve current data contracts unless changing schema intentionally.
3. Keep existing NextAuth and Prisma pipeline intact.
4. Fix route consistency first (URL paths, middleware matcher, redirects) before adding UI features.
5. Add answer-input and mistake-feedback UX as the first major PRD bridge.
6. Keep study screen cognitively simple: one primary action at each stage.
7. Maintain compatibility with KaTeX rendering behavior in src/components/MathRenderer.tsx.
