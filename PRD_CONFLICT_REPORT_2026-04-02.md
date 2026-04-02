# Colqad PRD Compliance Report

Date: 2026-04-02
Reviewer: GitHub Copilot (GPT-5.3-Codex)
Scope: PRD-to-implementation consistency check
Repository: calqonai

## Executive Summary
The current implementation does not fully align with the PRD. Core MVP conflicts exist in notebooks, document upload/processing, concept extraction, and RAG-based tutoring. Additional conflicts exist in answer checking, difficulty tiers, and auth verification flow.

## Findings (Ordered by Severity)

### 1) MVP Gap: Notebook + Upload + Concept Extraction Pipeline Not Implemented End-to-End
Severity: Critical

PRD expectation:
- Notebook System is MVP
- Document Upload and Processing is MVP
- Concept Extraction Engine is MVP

Observed:
- Notebooks page uses local mock data and local state only.
- No persisted notebook/document/concept entities exist in Prisma schema.

Evidence:
- PRD.md (MVP table and scope): lines 221, 222, 226, 474, 475, 476
- src/app/(app)/notebooks/page.tsx: mockNotebooks and local-only create flow
- prisma/schema.prisma: no Notebook, Document, Concept, or Chunk models

### 2) MVP Gap: AI Tutor Chat Is Not RAG-Backed
Severity: Critical

PRD expectation:
- Chat retrieves top-k notebook chunks from vector store and injects concept/mistake context.
- MVP explicitly includes AI tutor chat with RAG.

Observed:
- Chat prompt is built only from current problem text/solution or generic assistant prompt.
- No vector retrieval/RAG calls in chat route.

Evidence:
- PRD.md: lines 312, 313, 477
- src/app/api/chat/route.ts: no vector retrieval logic in prompt construction

### 3) Practice Review Uses Self-Rating Instead of Answer Checking
Severity: High

PRD expectation:
- Student submits an answer.
- System compares against expected answer (SymPy where possible).

Observed:
- Study page reveals solution and asks user for a recall rating.
- Review API accepts rating/timeTaken only; no submitted answer payload.

Evidence:
- PRD.md: lines 381, 398
- src/app/(app)/study/[problemId]/page.tsx: solution-first + rating buttons
- src/app/api/problems/[id]/review/route.ts: rating schema only

### 4) Spaced Repetition Card Types Conflict with PRD
Severity: High

PRD expectation:
- Card types include formula recall, concept definition, mini-problem, derivation-step cards.

Observed:
- Scheduling is attached to UserProblem records (problemId), implying problem-based review only.
- No distinct card entities for formula/concept/derivation cards.

Evidence:
- PRD.md: lines 428-432
- prisma/schema.prisma: UserProblem model is problem-linked
- src/app/api/problems/due/route.ts: returns due UserProblem records

### 5) Difficulty Model Mismatch
Severity: Medium

PRD expectation:
- Four difficulty levels: easy, medium, hard, challenge.

Observed:
- Prisma Difficulty enum supports EASY, MEDIUM, HARD only.

Evidence:
- PRD.md: lines 131, 359
- prisma/schema.prisma: Difficulty enum

### 6) Authentication Flow Missing Email Verification
Severity: Medium

PRD expectation:
- Email/password with email verification flow.

Observed:
- Registration creates user directly and signs in immediately.
- No verification token dispatch/verification step in registration flow.

Evidence:
- PRD.md: line 243
- src/app/api/auth/register/route.ts
- src/app/(auth)/register/page.tsx

### 7) Tutor Model Contract Mismatch
Severity: Medium

PRD expectation:
- Specific primary model and fallback behavior.

Observed:
- Chat route hardcodes a single Claude model; no fallback path.

Evidence:
- PRD.md: line 324
- src/app/api/chat/route.ts

### 8) Notebook CRUD Actions Incomplete vs PRD
Severity: Medium

PRD expectation:
- Notebook actions include create, delete, archive, rename.

Observed:
- UI shell exists for create/delete interaction, but not wired to persisted backend entities.
- Archive/rename flows are not implemented.

Evidence:
- PRD.md: lines 271-275
- src/app/(app)/notebooks/page.tsx

## Non-Conflicts / Notes
- Authentication methods (Google OAuth + email/password) are present.
- Spaced repetition algorithm exists (SM-2-style implementation), but card coverage and answer-verification depth diverge from PRD details.

## Recommended Next Steps
1. Define Notebook/Document/Concept schema and migrations.
2. Implement upload + extraction + chunking + embedding pipeline and storage model.
3. Add RAG retrieval in chat path using notebook context.
4. Introduce answer-submission and symbolic checking path for practice review.
5. Expand difficulty enum/logic if challenge tier is still required by PRD.
6. Implement email verification flow for credentials registration.
7. Complete notebook CRUD parity (rename/archive/delete/create) with persisted APIs.

## Method
This report is based on static inspection of PRD and repository code paths; no runtime E2E validation was executed as part of this report.
