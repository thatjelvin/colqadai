# Colqad Master Context

---

# Product Summary

What is Colqad?
Colqad is a university-math learning web app that combines topic exploration, AI-generated chapter summaries, retrieval-first problem practice, spaced repetition scheduling, interleaved review queues, and tutoring chat, with authentication, onboarding, billing, and progress tracking built around Supabase plus Next.js.

Elevator pitch:
A math-first study system that turns topic learning into guided summaries, active recall practice, and scheduled mixed review.

Mission:
Help university students learn math with stronger long-term retention through retrieval practice, spacing, and interleaving.

Vision:
Build an integrated math learning system that is more effective than passive summaries or generic chatbot tutoring alone.

Core problem solved:
Students forget math because their study workflows are unstructured, passive, and weak on recall/scheduling.

Unique value proposition:
Colqad unifies topic summaries, active problem attempts, error-aware feedback, and review scheduling in one product.

---

# Why Colqad Exists

Document:

- pain points
  - University math feels too generic in most learning tools.
  - Students re-read instead of recalling from memory.
  - Students do not know what to review next.
- founder goals
  - Build a math-specific system, not only a chatbot or only a flashcard tool.
  - Keep retrieval practice, spaced repetition, and interleaving as core mechanics.
- frustrations users face
  - Weak retention after passive studying.
  - Difficulty identifying knowledge gaps.
  - Need for concise explanations and worked steps.
- gaps in current solutions
  - Generic AI answers without structured review scheduling.
  - Traditional spaced tools without integrated tutoring and topic workflows.
- alternatives users use today
  - Generic AI chat tools.
  - Textbooks and videos.
  - Flashcard tools (explicitly referenced in product context docs).
- why alternatives are insufficient
  - They do not enforce a consistent source/summary/practice/review loop in one place.

---

# Target Users

Primary users
- University STEM students studying math-heavy courses.
- Goals: pass exams, retain concepts long-term, identify weak areas.
- Pain points: forgetting content, unstructured revision, unclear review priorities.
- Motivations: confidence, higher grades, efficient study time.
- Desired outcomes: measurable mastery growth and consistent review habits.

Secondary users
- Self-learners preparing for advanced math/ML topics.
- Goals: build structured progress without formal instruction.
- Pain points: no feedback loop, no personalized sequence.
- Motivations: upskilling and exam/graduate prep.
- Desired outcomes: clear next actions and durable recall.

Power users
- High-frequency learners on Pro/Max plans using large chat/problem quotas and notebooks.
- Goals: daily heavy practice and advanced analytics.
- Pain points: quota ceilings and fragmented tools.
- Motivations: speed, depth, and continuity.
- Desired outcomes: high-volume guided practice with insight into weak patterns.

---

# Product Features

Feature:
Authentication (email/password + Google OAuth)
Description:
Supabase auth with callback exchange and middleware route protection.
Purpose:
Secure access and user session continuity.
User benefit:
Fast sign-in and protected personalized learning state.
Current status:
Live
Dependencies:
Supabase Auth, middleware, callback route.
Related systems:
`src/middleware.ts`, `src/app/auth/callback/route.ts`, `src/lib/supabase/*`.

Feature:
Onboarding
Description:
4-step onboarding (course, level, challenge, acquisition source).
Purpose:
Capture initial profile and complete onboarding gate.
User benefit:
Personalized initial context and guided first-time setup.
Current status:
Live
Dependencies:
`profiles` table, admin Supabase client.
Related systems:
`src/app/onboarding/page.tsx`, `/api/user/onboarding`.

Feature:
Dashboard + Colly assistant
Description:
Dashboard shows streak/mastery/due stats, recent topic continuation, quick links, and Colly navigation assistant.
Purpose:
Central launchpad for daily learning actions.
User benefit:
Immediate next-step clarity.
Current status:
Live
Dependencies:
`user_topic_progress`, `user_streaks`, dashboard APIs, Colly API.
Related systems:
`src/app/(app)/dashboard/page.tsx`, `/api/dashboard/*`, `/api/colly`.

Feature:
Topic Explorer
Description:
Searchable hierarchical topic map with per-subtopic mastery percentages.
Purpose:
Discovery and navigation into subtopic study.
User benefit:
Fast topic selection and progress visibility.
Current status:
Live
Dependencies:
Static taxonomy + progress records.
Related systems:
`src/data/topics.json`, `TopicExplorerClient`, `/topics`, `/explore`.

Feature:
Chapter Summary Generation
Description:
Subtopic page builds/caches AI chapter summaries, formulas, derivations, worked examples, and prerequisites.
Purpose:
Concept framing before practice.
User benefit:
Concise structured study material per subtopic.
Current status:
Live
Dependencies:
Groq API key, `topic_summaries` table.
Related systems:
`src/app/explore/[slug]/page.tsx`, `ChapterSummaryClient`.

Feature:
Topic Review Sessions
Description:
Generates 12 review questions by difficulty, captures ratings, schedules next review, updates streak/progress.
Purpose:
Retrieval-focused topical reinforcement.
User benefit:
Structured repeated practice with measurable outcomes.
Current status:
Live
Dependencies:
`topic_review_questions`, `user_review_responses`, `user_topic_progress`, `user_streaks`.
Related systems:
`/review/[slug]`, `/api/review/responses`, `/api/review/complete`.

Feature:
Problem Practice (study by problem)
Description:
Attempt-before-reveal workflow with grading, optional worked-example mode, error classification, and SM-2 review update.
Purpose:
Active recall at problem level.
User benefit:
Immediate correctness feedback and personalized scheduling.
Current status:
Live
Dependencies:
Problem/UserProblem/Attempt models, feature flags, learning analytics.
Related systems:
`/study/[problemId]`, `/api/problems/*`, `sm2.ts`, `aiClassifiers.ts`.

Feature:
AI tutoring chat
Description:
Streaming Groq chat with session persistence and problem-scoped guardrails.
Purpose:
Contextual help during study.
User benefit:
Stepwise explanation support without leaving workflow.
Current status:
Live (as embedded component and session APIs)
Dependencies:
Chat session/message storage, billing usage limits.
Related systems:
`ChatInterface`, `/api/chat`, `/api/chat/sessions*`.

Feature:
Floating tutor help
Description:
Small in-page tutor widget scoped to current topic.
Purpose:
Quick just-in-time help.
User benefit:
Lower-friction question asking.
Current status:
Live
Dependencies:
`/api/tutor-help`.
Related systems:
`FloatingTutorHelp.tsx`.

Feature:
Knowledge Gaps
Description:
Groups topics into Needs Work / Getting There / On Track from review response distributions.
Purpose:
Highlight weak areas.
User benefit:
Better prioritization.
Current status:
Live
Dependencies:
`user_review_responses`, `user_topic_progress`.
Related systems:
`/gaps`.

Feature:
Analytics
Description:
Shows recall score, mastery, streak, top error patterns, with blurred detail for free plan.
Purpose:
Performance visibility and upsell.
User benefit:
Track progress and diagnose patterns.
Current status:
Live
Dependencies:
Problem attempts + billing access check.
Related systems:
`/analytics`, `/api/dashboard/stats`, `/api/billing/usage`.

Feature:
Notebooks
Description:
Create/list/delete notebooks, view notebook detail, generate summary+concepts from stored chunks.
Purpose:
Source-centered workspace for deeper study.
User benefit:
Consolidated study artifacts.
Current status:
In progress
Status notes:
- Works: summary/concept generation from existing `NotebookChunk` rows.
- Missing: current notebook endpoints (`src/app/api/notebooks/route.ts`, `src/app/api/notebooks/[id]/route.ts`, `src/app/api/notebooks/[id]/summary/route.ts`) do not provide upload/ingestion handlers that create `NotebookDocument` and `NotebookChunk` from user uploads.
Dependencies:
Notebook models/tables, processing utilities.
Related systems:
`/notebooks`, `/api/notebooks*`, `src/lib/notebooks/processing.ts`.

Feature:
Billing and plans
Description:
Free/Pro/Max limits, usage metering, feature gating, Paddle checkout/webhooks.
Purpose:
Monetization and quota control.
User benefit:
Predictable usage tiers and upgrade path.
Current status:
Live
Dependencies:
`profiles`, `usage_events`, Paddle env vars.
Related systems:
`src/lib/billing/*`, `src/lib/payments/paddle.ts`, `/api/billing/*`.

Feature:
Reminders
Description:
Sends scheduled review reminder emails from `review_reminders` records.
Purpose:
Retention and reactivation.
User benefit:
Prompts to return for due reviews.
Current status:
In progress
Status notes:
- Works: `/api/reminders/send` contains reminder-send logic.
- Missing: `/api/cron/reminders` still returns placeholder success payload and does not trigger send orchestration.
Dependencies:
CRON secret, admin Supabase access, Resend key.
Related systems:
`/api/reminders/send`, `/api/cron/reminders`, `src/lib/email/resend.ts`.

---

# User Journey

Map:

Discovery
- Landing page positioning: university-level rigor, structured chapters, mastery tracking.

Signup
- `/register` or `/login`, including Google OAuth and callback exchange.

Onboarding
- Multi-step onboarding writes profile and sets `onboarding_completed`.

First success moment
- Complete onboarding and reach dashboard; likely first visible success is exploring a topic and starting review/practice.

Core workflow
- Explore topic -> open chapter summary -> start review or practice -> submit ratings/attempts -> update progress/streak.

Retention loop
- Due reviews + streak + reminders + dashboard follow-up cards.

Sharing loop
- UNKNOWN (no explicit social sharing/productized referral flow found in active UI).

Review flow
- Topic review session with difficulty tiers and rating capture updates `user_topic_progress` and streak scheduling.

---

# Current Product State

What exists now
- Auth, onboarding, dashboard, topic explorer, chapter summaries, review sessions, study/problem flow, tutoring chat APIs, gaps, analytics, pricing, billing limits.

What appears unfinished
- Notebook source-document ingestion endpoints/UX are incomplete in current route set.
- Standalone `/chat` page is not present even though chat infrastructure exists.
- Reminders cron orchestration endpoint is placeholder-like (`count: 0`).

Missing systems
- `/api/reflections` route is referenced by study UI but not present.
- Explicit sharing/referral UX loop is not found in current routes.

Technical debt
- `src/lib/db.ts` is an in-memory proxy fallback, not a persistent transactional DB client; this is a high-impact risk if used beyond local/dev contexts because state is non-durable and can cause cross-request inconsistency.
- Several docs/spec files describe functionality that diverges from current code.
- Heavy debug logging in auth/onboarding profile paths.

Potential UX issues discovered
- Dashboard states content upload was removed, while other docs still mention upload-first flow.
- Free users see premium entry points that route to pricing.
- Some instructional copy in docs and app is inconsistent about whether source upload is current core behavior.

---

# Brand Personality

If Colqad were a person:

Personality traits
- Focused, practical, rigorous, supportive.

Communication style
- Direct, concise, study-oriented, math-first.

Values
- Long-term retention, active recall, clarity, consistency.

Tone
- Calm confidence; avoids hype.

Energy
- Serious builder energy with student empathy.

What Colqad never sounds like
- Generic “AI magic” marketing voice.

Words to avoid
- “Revolutionary”, “game-changing”, vague corporate buzzwords.

Words frequently used
- mastery, review, practice, topic, retention, spaced repetition, interleaving, university-level.

---

# Writing Rules For AI Agents

All future agents must:

- avoid generic AI language
- avoid sounding corporate
- avoid fake enthusiasm
- avoid buzzwords
- write naturally
- sound like real builders
- maintain product consistency

Additionally from codebase voice:
- Keep explanations concise and actionable.
- Emphasize attempt-before-reveal and review consistency.
- Prefer concrete learning actions (“Start review”, “Practice”, “Track gaps”) over abstract claims.

---

# Build In Public Context

Document:

Current journey
- Shipping active learning workflows while still consolidating source-ingestion/notebook completeness.

What founder is building
- A math-native integrated learning loop (topic understanding + active practice + scheduled review).

Progress narrative
- Recent visible commits center on landing redesign and crash fixes.

Experiments
- Topic summary generation format and review-question generation with Groq.
- Colly navigation assistant and floating tutor assistance.

Wins
- Core retrieval/spaced/interleaved mechanics are implemented in app flows.

Failures
- Observed product-documentation divergence (PRD/COLQAD_FEATURES vs current routes/APIs).
- Incomplete notebook ingestion flow despite notebook summary/concept surfaces.
- Missing `/api/reflections` endpoint referenced by study UI.
- Reminder cron orchestration route still placeholder.

Interesting metrics
- Landing references “76+ university students” as displayed in landing-page copy in this repository snapshot (verified on 2026-05-14); current production validity still needs founder confirmation.
- App tracks streak, mastery %, due count, recall score, top error type.

Future roadmap
- PRD-documented roadmap themes (founder confirmation required because current code diverges): mistake-detection expansion, knowledge graph visualization, web research mode, video ingestion, and broader adaptive/exam simulation capabilities.

Public storytelling opportunities
- Before/after examples of passive study vs retrieval-first workflow.
- Topic review/streak progress stories.
- “Why mixed review beats cramming” product walkthroughs.

---

# Content Intelligence

Create sections for:

LinkedIn strategy
- voice: rigorous builder sharing learning-science product decisions.
- tone: practical, transparent, non-hype.
- best post styles: mini case studies, product teardown clips, “what we changed and why.”
- story opportunities: onboarding-to-first-review funnel, retrieval-first design decisions, pricing/plan learnings.
- content angles: university STEM outcomes, study behavior data, product iteration notes.
- topics: spaced repetition implementation, interleaving defaults, error taxonomy usage.
- things to avoid: generic “AI tutor” claims without product specifics.

X strategy
- voice: concise shipping updates + sharp opinions on learning effectiveness.
- tone: fast, clear, direct.
- best post styles: short build logs, feature clips, experiment result threads.
- story opportunities: weekly shipping notes, lesson learned from failed assumptions.
- content angles: “what we removed” (passive features) vs “what improved retention.”
- topics: streak mechanics, review scheduling, prompt constraints.
- things to avoid: engagement bait and overclaiming outcomes.

Reddit strategy
- voice: honest practitioner helping students study better.
- tone: no-marketing, problem-solution oriented.
- best post styles: long-form breakdowns, feedback requests, “show your workflow” posts.
- story opportunities: exam prep workflows, mistakes classification and remediation.
- content angles: practical study systems for calculus/linear algebra.
- topics: spaced practice routines, active recall UX, handling math notation in AI tooling.
- things to avoid: obvious promo dumps and unverifiable performance claims.

---

# AI Knowledge Gaps

List unknowns:

NEEDS FOUNDER INPUT:
- What is the official single-sentence mission/vision copy to standardize everywhere?
- Is the primary canonical flow now topic-exploration-first, source-upload-first, or hybrid?
- Should notebooks include user-facing document upload in current release scope, and if yes what UX/API contract is intended?
- Is there a planned standalone `/chat` page, or is embedded tutoring the intended permanent model?
- What are the authoritative activation, retention, and conversion metrics to reference publicly?
- What is the current active user count (beyond landing’s “76+” label) and date validity of that claim?
- Which roadmap items are committed for next milestone vs aspirational PRD content?
- What is the official brand voice guide for channel-specific posting cadence and CTA style?
- Should reminders remain free or become paid-tier behavior?
- Is referral/share loop intentionally deferred or currently undocumented?

Read this file before performing any task.
