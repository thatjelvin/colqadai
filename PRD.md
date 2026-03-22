# Nexus — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** March 2026  
**Author:** Nexus Product Team

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Problem Statement](#2-problem-statement)
3. [User Personas](#3-user-personas)
4. [Learning Methodology](#4-learning-methodology)
5. [User Journeys](#5-user-journeys)
6. [Core Features](#6-core-features)
7. [Feature Specifications](#7-feature-specifications)
8. [MVP Scope](#8-mvp-scope)
9. [Future Roadmap](#9-future-roadmap)
10. [Success Metrics](#10-success-metrics)
11. [Risks and Mitigations](#11-risks-and-mitigations)

---

## 1. Product Vision

**Nexus is a math-first AI learning environment** — a notebook, tutor, and practice engine unified into a single product.

Where general-purpose AI tools surface summaries and generic explanations, Nexus is purpose-built for the specific cognitive demands of mathematics: conceptual understanding, procedural fluency, and deep long-term retention. It does this by combining a notebook-style interface with a RAG-powered AI tutor, an automated practice generation engine, mistake-aware feedback, spaced repetition scheduling, and a concept knowledge graph.

The vision is simple: every math student, regardless of institution or background, should have access to an AI system that genuinely teaches — not one that just answers.

---

## 2. Problem Statement

### 2.1 The Core Gap

Existing AI tools fail math students in predictable ways:

- **ChatGPT and similar LLMs** answer questions but do not generate structured learning. They provide answers without enforcing recall, practice, or retention.
- **NotebookLM** ingests documents and surfaces summaries but is not designed for mathematics. It does not detect formulas, generate practice problems, or adapt to student mistakes.
- **Khan Academy and Brilliant** offer structured practice but are curriculum-locked. Students cannot upload their own lecture notes or textbook chapters and build a personalized system around them.
- **Anki** provides spaced repetition but requires students to manually create cards, and has no math-native understanding.

### 2.2 Why Math Specifically

Math learning has properties that make generic AI tools particularly inadequate:

- **Procedural depth**: Solving a math problem requires chained reasoning steps, not just recall of a fact.
- **Error compounding**: A misconception at the level of the chain rule causes cascading failures across related topics.
- **Volume requirements**: Mastery requires solving large numbers of varied problems — reading explanations is not enough.
- **Formula-dense content**: Uploaded materials contain LaTeX and symbolic notation that generic tools mangle or ignore.
- **Prerequisite sensitivity**: You cannot understand eigenvalues without linear independence without vectors. Generic tools do not model this dependency.

### 2.3 The Opportunity

Nexus occupies a defensible and underserved position: a **personalized, material-aware, practice-heavy math learning system**. It is built specifically for students who are studying from their own course materials and need a system that adapts to what they're learning, when they're learning it.

---

## 3. User Personas

### Persona 1 — Aisha, University Mathematics Student

- **Age:** 20
- **Context:** Second-year undergraduate studying mathematics. Taking Analysis, Linear Algebra, and Probability simultaneously.
- **Pain points:** Lectures move too fast. Textbooks are dense. She understands concepts when explained but forgets them by exam time. Practice problems in the textbook have no worked solutions.
- **Goals:** Understand proofs. Be able to reproduce derivations from memory. Perform well on timed exams.
- **How Nexus helps:** She uploads her lecture notes and textbook PDFs. Nexus extracts the concepts, generates targeted practice problems at three difficulty levels, and schedules spaced reviews of the topics she struggles with most.

---

### Persona 2 — Dev, Engineering Student

- **Age:** 22
- **Context:** Third-year electrical engineering student. Taking Signals and Systems, which requires heavy use of Fourier transforms, Laplace transforms, and differential equations.
- **Pain points:** The math in his engineering courses is applied differently than in pure math courses. He needs to see worked examples, not just theory. He does not have time to search YouTube for hours per topic.
- **Goals:** Quickly get up to speed on specific math topics. Generate practice problems tied to his lecture slides.
- **How Nexus helps:** He uploads his lecture slides. Nexus generates a concept map of the mathematical topics covered, creates step-by-step worked examples, and generates practice problems with increasing difficulty.

---

### Persona 3 — Marcus, Self-Learner Preparing for Graduate School

- **Age:** 27
- **Context:** Working professional who studied computer science. Preparing for a PhD in machine learning. Needs to deeply learn real analysis and linear algebra.
- **Pain points:** Has no professor or TA. Must self-assess. Standard textbooks are too slow; he needs to identify gaps quickly.
- **Goals:** Identify weak areas fast. Build mastery through targeted practice. Track progress over time.
- **How Nexus helps:** He uses Web Research Mode to build structured modules on topics without existing materials. The concept graph shows him prerequisite gaps. The spaced repetition system ensures he does not forget what he has studied.

---

### Persona 4 — Priya, High School Student

- **Age:** 17
- **Context:** Preparing for A-Level Mathematics and Further Mathematics. Taking topics including calculus, statistics, and mechanics.
- **Pain points:** School resources are limited. Past papers help but have no adaptive component. She does not know which topics to prioritize.
- **Goals:** Pass exams with top grades. Build conceptual understanding, not just procedural ability.
- **How Nexus helps:** She uploads her syllabi and past papers. Nexus builds a concept map from the syllabus and generates practice problems that mirror exam style. Mistake detection surfaces the specific topics where she needs more work.

---

## 4. Learning Methodology

Nexus is grounded in six evidence-based learning science principles, each of which maps directly to a product feature.

### 4.1 Spaced Repetition

**Principle:** Information retained through distributed review sessions over time is remembered far better than information studied in massed sessions.

**Implementation in Nexus:** After a student first encounters a concept or problem type, the spaced repetition scheduler queues it for review at increasing intervals: 1 day, 3 days, 7 days, 14 days, 30 days. Interval length is adjusted based on performance. Items answered incorrectly are demoted to shorter intervals. Items answered correctly are promoted to longer intervals.

Cards include: formula recall, concept definitions, short computational problems, derivation steps.

---

### 4.2 Active Recall

**Principle:** Retrieving information from memory strengthens the memory trace more than re-reading the material.

**Implementation in Nexus:** The practice engine and spaced repetition system are structured around active retrieval. Students are never simply shown information and asked to confirm they have seen it. Every review session requires either solving a problem, writing a derivation, or answering a conceptual question from memory before the solution is revealed.

---

### 4.3 Deliberate Practice

**Principle:** Mastery comes from targeted practice at the edge of competence, not from repeating what is already easy.

**Implementation in Nexus:** The practice engine generates problems at four difficulty levels (easy, medium, hard, challenge). The system tracks per-concept performance and automatically elevates the difficulty distribution as mastery increases. It also uses interleaving across related concepts to prevent students from relying on context to trigger the correct procedure.

---

### 4.4 Error-Based Learning

**Principle:** Mistakes are the most information-dense signal in a learning session.

**Implementation in Nexus:** When a student submits an incorrect answer or incorrect step, the system classifies the error into a taxonomy of mathematical misconceptions (e.g., chain rule omission, sign error, algebraic manipulation error, domain confusion). It then generates a targeted set of problems specifically designed to address that misconception. The error history is persisted and used to influence the spaced repetition schedule and difficulty selection.

---

### 4.5 Step-by-Step Reasoning

**Principle:** Seeing worked solutions with explicit reasoning steps supports the development of procedural schemas.

**Implementation in Nexus:** All AI-generated solutions show the full reasoning chain. Each step is labeled with the rule or theorem being applied. Intermediate results are shown. Final answers are never returned without accompanying work. This applies to both AI tutor chat responses and generated problem solutions.

---

### 4.6 Interleaving

**Principle:** Mixing problem types during practice sessions improves long-term retention and transfer compared to blocked practice on a single topic.

**Implementation in Nexus:** The practice engine does not generate 20 consecutive chain rule problems. Instead, after a student has demonstrated basic competence on a topic, the engine begins mixing related concept types (e.g., chain rule, product rule, and quotient rule problems in the same session). The concept graph is used to identify which topics are close enough to interleave productively.

---

## 5. User Journeys

### Journey 1 — Uploading Materials and Getting Started

1. User creates a new Notebook titled "Calculus II."
2. User uploads three PDFs: lecture notes, a textbook chapter, and a past exam.
3. Nexus ingests the materials, extracts text and math formulas, and chunks the content.
4. The concept extraction engine identifies key topics: integration by parts, substitution, partial fractions, improper integrals, sequences and series.
5. Nexus builds a concept map and displays it to the user.
6. User sees a structured learning module for each concept.
7. User clicks into "Integration by Parts" and immediately has access to AI chat, concept summary, and practice problems.

---

### Journey 2 — Practice Session

1. User opens their "Linear Algebra" notebook.
2. User selects "Practice" and chooses "Eigenvalues and Eigenvectors."
3. Nexus generates 10 problems: 4 easy, 4 medium, 2 hard.
4. User works through problems and submits answers.
5. On problem 6 (finding eigenvectors), user makes an arithmetic error during row reduction.
6. Nexus classifies the error as a row operation mistake, shows the correct step with reasoning, and adds 3 targeted row reduction practice problems to the session.
7. At session end, Nexus updates the spaced repetition schedule: row reduction is queued for review in 1 day; eigenvalue computation (answered correctly) is scheduled for review in 3 days.

---

### Journey 3 — Spaced Repetition Review

1. User opens Nexus. Dashboard shows "7 items due for review."
2. User enters the review session.
3. Session contains a mix of: a formula recall card (determinant of a 2x2 matrix), a concept card (what is the geometric meaning of eigenvalues), and two short computational problems.
4. User completes the session in 12 minutes.
5. Items answered correctly are promoted to longer intervals. One item answered incorrectly is reset to a 1-day interval.

---

### Journey 4 — AI Tutor Chat

1. User is reading their Linear Algebra notebook and encounters a concept they do not understand.
2. User opens the chat panel and asks: "Why does the determinant being zero mean the matrix is not invertible?"
3. AI tutor responds with: a conceptual explanation, a geometric interpretation, a step-by-step proof of the equivalence, and a worked example.
4. User follows up: "Can you show me an example where the determinant is zero and explain why it fails to invert?"
5. AI generates a 3x3 singular matrix example, shows the failed row reduction, and links the result back to the concept.
6. User asks for practice problems on this. Three problems are added to their practice queue.

---

### Journey 5 — Web Research Mode

1. User does not have materials on a topic but wants to study Fourier Series.
2. User uses Web Research Mode and enters "Fourier Series."
3. Nexus searches the web, retrieves relevant educational content, identifies key subtopics: periodic functions, orthogonality, Fourier coefficients, convergence.
4. A structured learning module is built and saved to the user's notebook.
5. Practice problems are generated from the module content.

---

## 6. Core Features

| # | Feature | Priority | MVP |
|---|---------|----------|-----|
| 1 | Authentication (Google OAuth + Email/Password) | P0 | Yes |
| 2 | Notebook System | P0 | Yes |
| 3 | Document Upload and Processing | P0 | Yes |
| 4 | AI Tutor Chat | P0 | Yes |
| 5 | Practice Engine | P0 | Yes |
| 6 | Step-by-Step Solution Engine | P0 | Yes |
| 7 | Concept Extraction Engine | P0 | Yes |
| 8 | Mistake Detection and Targeted Practice | P1 | No |
| 9 | Spaced Repetition System | P1 | Yes |
| 10 | Progress Tracking Dashboard | P1 | Yes |
| 11 | Knowledge Graph Visualization | P1 | No |
| 12 | Web Research Mode | P2 | No |
| 13 | Parameterized Problem Variants | P1 | Yes |
| 14 | YouTube / Lecture Video Ingestion | P2 | No |

---

## 7. Feature Specifications

### 7.1 Authentication

**Supported methods:**
- Google OAuth 2.0
- Email and password (with bcrypt hashing, email verification flow)

**Account data stored per user:**
- Display name, email, avatar
- Notebook list and metadata
- Learning history and streak data
- Spaced repetition card states
- Practice performance records

**Session management:**
- JWT-based sessions with refresh tokens
- Session expiry: 7 days with sliding renewal

---

### 7.2 Notebook System

Each notebook represents a distinct learning context.

**Notebook fields:**
- Title, description, subject tag
- Created date, last accessed date
- List of source documents
- List of extracted concepts
- List of practice sessions
- List of spaced repetition cards
- Chat conversation history

**Actions available:**
- Create notebook
- Delete notebook
- Archive notebook
- Rename notebook
- Share notebook (read-only link) — roadmap
- Export notebook as PDF — roadmap

---

### 7.3 Document Upload and Processing

**Supported upload types:**
- PDF
- PPTX (lecture slides)
- TXT, Markdown

**Processing pipeline:**
1. File received, stored in object storage (S3)
2. Text extraction (PyMuPDF for PDFs, python-pptx for slides)
3. Math formula detection (regex + MathPix API or custom model)
4. Document chunking (512 token chunks with 64 token overlap)
5. Embeddings generated via OpenAI `text-embedding-3-small`
6. Embeddings stored in Pinecone (namespaced per notebook)
7. Raw text stored in PostgreSQL with chunk metadata

**Formula handling:**
- LaTeX expressions detected and preserved in original notation
- Stored as both raw LaTeX and rendered MathML for display
- Formulas included in embedding context

---

### 7.4 AI Tutor Chat

**Interface:**
- Chat panel docked to the right of the notebook view
- Full conversation history persisted per notebook
- Supports LaTeX rendering inline in chat messages (KaTeX)

**System prompt construction:**
- Retrieves top-k relevant chunks from notebook's vector store (RAG)
- Injects student's current concept context and recent mistake history
- Instructs model to show step-by-step reasoning
- Instructs model to generate examples on request
- Instructs model to use LaTeX for all formulas

**Response requirements:**
- All solutions must show intermediate reasoning steps
- All formulas must be enclosed in LaTeX delimiters
- Responses must reference source material when applicable
- Examples must be worked fully, not just described

**Model:** Claude claude-sonnet-4-20250514 (primary), with fallback to GPT-4o

---

### 7.5 Concept Extraction Engine

After document processing, the system runs a concept extraction pipeline.

**Pipeline steps:**
1. Prompt LLM with chunked document content
2. LLM identifies: key concepts, prerequisite relationships, difficulty level per concept
3. Concepts are stored as nodes in the concept graph (PostgreSQL + pgvector)
4. Concept map is generated for the notebook
5. Each concept is linked to the source chunks that define it

**Output per concept:**
- Name
- One-paragraph definition
- Prerequisites (links to other concepts)
- Difficulty rating (1–5)
- Source chunk references
- Suggested practice problem types

---

### 7.6 Practice Engine

This is the core feature of Nexus.

**Problem generation:**
- For each concept, the system generates problems at 4 difficulty levels
- Each difficulty level targets specific cognitive demands:
  - Easy: Direct application of a single rule or formula
  - Medium: Multi-step problems requiring 2–3 concepts
  - Hard: Non-routine problems requiring insight or combination of techniques
  - Challenge: Proof-style or open-ended derivations

**Problem types:**
- Computational (solve for a value)
- Conceptual (explain or describe)
- Proof-style (show that X implies Y)
- Multiple choice
- Step solving (fill in a missing step in a worked solution)

**Parameterized variants:**
- Problems are generated with variable parameters
- Example: d/dx(x^n) spawned with n = 2, 3, 4, 5x^3, etc.
- Prevents memorization of specific answers while testing the same skill

**Session structure:**
- Default session: 10 problems
- Configurable session length
- Interleaved mode: mixes concepts from the same notebook
- Focused mode: single concept

**Submission and feedback:**
- Student submits answer or step
- System compares against expected answer (symbolic math comparison via SymPy)
- Correct: show solution with explanation, award mastery point
- Incorrect: classify error, show corrected solution, optionally add remedial problems

---

### 7.7 Step-by-Step Solution Engine

All solutions generated by Nexus must follow this format:

1. **Problem restatement** — restate the problem clearly
2. **Identify approach** — name the technique or theorem being used
3. **Step-by-step work** — each step on its own line with the rule applied labeled in brackets
4. **Intermediate results** — show partial answers at each stage
5. **Final answer** — boxed or clearly marked
6. **Verification** (where applicable) — check the answer by substitution or alternate method

Solutions are generated via the AI and also checked symbolically via SymPy where possible.

---

### 7.8 Mistake Detection

**Error taxonomy (non-exhaustive):**
- Conceptual error: wrong theorem or rule applied
- Procedural error: correct rule, wrong execution (e.g., sign error, arithmetic)
- Omission error: missing step (e.g., forgot chain rule)
- Domain error: ignoring constraints or domain restrictions
- Notation error: formula written incorrectly

**Detection method:**
- LLM classifies the student's answer against the expected answer
- Error type is extracted from the LLM response
- Error is logged to the student's error history in PostgreSQL
- Remedial problem set is generated targeting the detected error type

**Long-term use:**
- Error history influences spaced repetition priority
- Weekly "weak area" summary generated from error history
- Practice session composition adjusted toward high-error topics

---

### 7.9 Spaced Repetition System

**Algorithm:** SM-2 adapted for mathematics (interval-based, not SM-18)

**Card types:**
- Formula recall (show formula name, student writes formula)
- Concept definition (show concept name, student explains it)
- Mini-problem (short computational problem from practice history)
- Derivation step (fill in a missing step in a derivation)

**Schedule:**
- New card: review after 1 day
- Correct answer: interval multiplied by ease factor (default 2.5)
- Incorrect answer: interval reset to 1 day, ease factor reduced by 0.2
- Minimum ease factor: 1.3

**Daily review session:**
- Dashboard shows due cards count
- Session shows cards in random order
- At end of session, updated intervals are saved

---

### 7.10 Progress Tracking Dashboard

**Displays:**
- Concept mastery by topic (0–100% based on practice performance)
- Problems attempted and accuracy rate per concept
- Spaced repetition due items
- Practice streak (days in a row with at least one session)
- Weak areas (concepts with accuracy below 60%)
- Time spent per notebook

---

### 7.11 Knowledge Graph Visualization

- Visual graph of concepts and their prerequisite relationships
- Nodes colored by mastery level (red = unstarted, yellow = in progress, green = mastered)
- Click a node to enter the concept's practice module
- Graph rendered using D3.js or React Flow

---

## 8. MVP Scope

The MVP delivers the core learning loop: upload materials, extract concepts, practice, and review.

**MVP includes:**
- Authentication (Google OAuth + email/password)
- Notebook creation and management
- PDF and PPTX upload and processing
- Concept extraction (text-based, not full graph visualization)
- AI tutor chat with RAG
- Practice engine (computational and multiple choice problems)
- Step-by-step solution display
- Basic spaced repetition (formula and concept cards)
- Progress tracking (accuracy and review schedule)

**MVP excludes:**
- Mistake detection and targeted remediation
- Knowledge graph visualization
- Web Research Mode
- YouTube/video ingestion
- Parameterized problem variants
- Interleaved practice across notebooks
- Mobile app

**Target MVP timeline:** 10–12 weeks

---

## 9. Future Roadmap

### Phase 2 (Months 3–5)
- Mistake detection and error-based problem generation
- Knowledge graph visualization (D3.js)
- Parameterized problem variants (SymPy-powered)
- Interleaved practice mode
- Export notebook as PDF

### Phase 3 (Months 6–9)
- Web Research Mode (build module from a topic search)
- YouTube video ingestion (transcript extraction + concept detection)
- Collaborative notebooks (share with classmates)
- Mobile app (React Native or PWA)
- Instructor mode (create shared notebooks for a class)

### Phase 4 (Months 10–18)
- Adaptive learning paths (system suggests what to study next)
- Exam simulation mode (timed, exam-style sessions)
- Integration with university LMS systems
- Multi-subject expansion: Physics, Chemistry, Computer Science
- Analytics dashboard for instructors

---

## 10. Success Metrics

### Acquisition
- Monthly active users (MAU)
- Notebook creation rate (target: >1 notebook per new user in first session)
- Upload conversion rate (% of users who upload at least one document)

### Engagement
- Daily active users / MAU ratio (target: >30%)
- Average practice problems attempted per session (target: >8)
- Spaced repetition session completion rate (target: >70%)
- Return rate at Day 7 and Day 30

### Learning Outcomes
- Average accuracy improvement per concept over 3 sessions (target: >15%)
- Spaced repetition retention rate (% of cards promoted vs. demoted)
- Weak area resolution rate (% of flagged weak areas that reach >70% accuracy within 14 days)

### Product Quality
- AI tutor response satisfaction (thumbs up/down) (target: >80% positive)
- Practice problem quality rating (target: >4.0/5.0 average)
- Average time to first practice problem from upload (target: <3 minutes)

---

## 11. Risks and Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|-----------|
| AI generates incorrect math solutions | High | Medium | SymPy symbolic verification layer; human-in-the-loop review queue for flagged errors |
| Formula extraction from PDFs is unreliable | High | High | Fallback to MathPix OCR API; user can manually correct extracted formulas |
| LLM costs become prohibitive at scale | Medium | Medium | Aggressive caching of problem sets; tiered pricing model; smaller model for non-critical generation |
| Students game spaced repetition (always mark correct) | Medium | Low | Optional forced answer submission before reveal; performance cross-checked against practice sessions |
| Low engagement after initial session | High | Medium | Streak mechanics, daily review reminders, progress milestones, and weak area alerts |
| Competitor (Khanmigo, Wolfram Alpha) expands feature set | Medium | Medium | Stay ahead via deeper material personalization and spaced repetition — features that require user data that competitors cannot replicate quickly |
| Uploaded copyrighted textbooks | High | High | DMCA policy; processing limited to embedding; raw text not stored for display; ToS enforcement |
