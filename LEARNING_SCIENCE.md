# Colqad Learning Science

Colqad is designed around six evidence-based learning methods for university STEM learners. The product flow remains:

1. Source input
2. Summarization
3. Concept explanation
4. Active practice
5. Spaced review
6. Interleaved reinforcement

## 1) Spaced Repetition (SM-2)

Research signal:
- Distributed practice has a large, robust retention effect over massed practice.
- Typical reported effect sizes are moderate to large depending on delay and design (commonly around d = 0.4 to 0.8 in educational settings).

Colqad implementation:
- Scheduling engine in src/lib/sm2.ts
- Review updates in src/app/api/problems/[id]/review/route.ts
- Due queue and urgency in src/app/api/problems/due/route.ts
- Data fields stored in UserProblem:
  - easeFactor
  - interval
  - repetitions
  - nextReviewAt

## 2) Retrieval Practice (Active Recall)

Research signal:
- Retrieval practice reliably improves long-term retention compared with restudy.
- Classroom and lab findings often show moderate to large gains (frequently around g = 0.4 to 0.7).

Colqad implementation:
- Attempt-before-reveal flow in src/app/(app)/study/[problemId]/page.tsx
- Attempt endpoint in src/app/api/problems/[id]/attempt/route.ts
- Per-problem tracking:
  - attemptsBeforeCorrect on UserProblem
  - attemptNumber and attemptsBeforeCorrect on ProblemAttempt
- Recall score surfaced on dashboard and analytics

## 3) Interleaved Practice

Research signal:
- Interleaving improves discrimination and transfer relative to blocked practice, especially across similar problem types.
- Typical observed benefits are moderate, though context-sensitive.

Colqad implementation:
- Queue engine in src/lib/learning/interleaving.ts
- Session generation in src/app/api/study/session/route.ts
- Review page summarizes topic mix in src/app/(app)/study/page.tsx
- Topic page CTA promotes interleaved session launch in src/app/(app)/topics/[slug]/page.tsx

## 4) Elaborative Interrogation

Research signal:
- Why-questions and self-explanation prompts increase conceptual integration and retention.
- Effects vary by domain and prompt quality, generally small-to-moderate positive.

Colqad implementation:
- Elaboration prompt generation in src/lib/learning/aiClassifiers.ts
- Prompt returned after correct attempts from src/app/api/problems/[id]/attempt/route.ts
- Reflection persistence in src/app/api/reflections/route.ts
- Reflection history in src/app/(app)/reflections/page.tsx

## 5) Worked-Example Study (Study -> Cover -> Generate)

Research signal:
- Worked examples reduce cognitive load in early acquisition.
- Example-to-problem fading and generation improves transfer for novice to intermediate learners.

Colqad implementation:
- Worked Example Mode in src/app/(app)/study/[problemId]/page.tsx
- Minimum 60-second study gate
- Session tracking endpoint in src/app/api/problems/[id]/worked-example/route.ts
- Stored metrics:
  - studyDurationSeconds
  - generateAttempt
  - selfAssessedMatch

## 6) Error Analysis

Research signal:
- Structured error diagnosis improves metacognitive accuracy and targeted remediation.
- Highest impact occurs when error categories map directly to follow-up practice.

Colqad implementation:
- Error classification in src/lib/learning/aiClassifiers.ts
- Error tagging on attempts via src/app/api/problems/[id]/attempt/route.ts
- Error log API in src/app/api/errors/log/route.ts
- Dashboard page in src/app/(app)/error-log/page.tsx
- Weekly dominant-error summary surfaced in dashboard and analytics

## Feature Flags

All six methods are kill-switchable through feature flags:
- feature_flags table
- Utility: src/lib/learning/featureFlags.ts
- Exposed API: src/app/api/learning/flags/route.ts

Flag names:
- spaced_repetition
- retrieval_practice
- interleaved_practice
- elaborative_interrogation
- worked_example_study
- error_analysis

## Learning Analytics Table

learning_analytics stores per-user per-session aggregates by method.

Tracked dimensions include:
- retrieval first-attempt success
- interleaving breadth
- worked-example adherence
- error distribution
- elaboration prompt engagement

Writer utility:
- src/lib/learning/analytics.ts

## Notes On Effect Sizes

Effect sizes vary with assessment delay, student prior knowledge, implementation quality, and task type. Colqad uses these methods as complementary mechanisms rather than isolated interventions.
