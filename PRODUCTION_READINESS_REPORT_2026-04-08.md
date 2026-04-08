# Colqad Production Readiness Report

Date: 2026-04-08  
Method: Static code review against Colqad app-context skill (Source -> Summary -> Explain -> Practice -> Schedule -> Interleave), plus key PRD/README claims.

## Executive Summary

Current state: **Partially aligned** with the Colqad learning-science vision.  
The app has strong implementation for practice, spaced repetition, interleaving, and chat tutoring, but the front half of the core journey (source ingestion -> summary -> concept extraction) is not implemented end-to-end.

Production readiness: **Not ready yet**.

## Quick Rundown Against Skill Journey

1. Source Input: **Not implemented end-to-end**
- Notebooks UI is mock-driven, not database/API-backed (`src/app/(app)/notebooks/page.tsx`).
- No notebooks API routes found (`src/app/api/notebooks/**` missing).
- No notebook/document models in schema (`prisma/schema.prisma` has no Notebook/Document entities).

2. Summarization: **Missing**
- No summarization pipeline tied to user-uploaded materials was found in API routes.

3. Concept Explanation: **Partially implemented**
- AI tutor chat exists and supports math-focused prompts (`src/app/api/chat/route.ts`).
- Explanations are not grounded in uploaded user source docs because source ingestion is missing.

4. Practice (active recall): **Implemented**
- Attempt flow, error classification hooks, and retrieval gating exist (`src/app/api/problems/[id]/attempt/route.ts`).

5. Spaced Repetition: **Implemented**
- SM-2 scheduling and review updates exist (`src/lib/sm2.ts`, `src/app/api/problems/[id]/review/route.ts`).

6. Interleaved Practice: **Implemented**
- Topic-only sessions are explicitly blocked and mixed queues are generated (`src/app/api/study/session/route.ts`, `src/lib/learning/interleaving.ts`).

## Production Blockers (Must Fix Before Push to Production)

1. Core source-to-learning pipeline is incomplete
- Missing notebook persistence and APIs.
- Missing document upload/ingestion/chunking flow.
- Missing source-grounded summarization/concept extraction flow.

2. Notebooks experience is currently mock-only
- Hardcoded notebook data and creation flow do not persist (`src/app/(app)/notebooks/page.tsx`).

3. Broken navigation risk in notebooks
- Notebook cards link to `/notebooks/{id}` but there is no matching app route under `src/app/(app)/notebooks/[id]`.

4. Type safety is broadly disabled in critical surfaces
- Multiple app/API files use `// @ts-nocheck` (chat, attempts, study session, dashboard, auth, topics, etc.).

5. Payment abstraction includes placeholder implementation
- `FadoService` still returns placeholder session IDs and stub verification (`src/lib/payments/fado.ts`).

6. AI client has insecure fallback behavior
- Anthropic client accepts a dummy API key fallback (`src/lib/anthropic.ts`), which can hide configuration mistakes.

7. Environment validation appears unused
- Strict env schema exists (`src/lib/env.ts`) but no imports were found in runtime code, so required env checks may never execute.

8. Automated test coverage is very thin and has a flawed assertion
- Only one unit test file exists (`__tests__/sm2.test.ts`).
- Contains a tautological assertion that cannot validate interval growth (`expect(state.interval).toBeGreaterThan(state.interval)`).

9. Build status currently unresolved
- Latest observed `npm run build` exited with code 1 in terminal context; this must be clean before production.

## Count: Things To Handle Before Production

**9 items** (the blockers above).

## Recommended Fix Order

1. Implement notebook + document domain models and APIs.
2. Add source ingestion pipeline (PDF/text/links), then summary + concept extraction tied to source documents.
3. Replace notebooks mock UI with real data and working create/open flows.
4. Remove `@ts-nocheck` from highest-risk routes first (`chat`, `attempt`, `study/session`, `auth`).
5. Remove dummy Anthropic fallback and enforce runtime env validation import/use.
6. Resolve payment provider path consistency (Paddle vs Fado abstraction) and remove stubs.
7. Fix failing build and add CI gates (`typecheck`, `lint`, `test`, `build`).
8. Expand tests for auth, billing, chat, and learning API routes.
9. Re-run readiness review before release candidate.

## Final Verdict

The app demonstrates strong learning-science mechanics on the practice side, but it does **not yet satisfy the full Colqad journey** defined by the skill because source ingestion and source-grounded summarization/concept extraction are missing. Handle the 9 blockers above before production release.
