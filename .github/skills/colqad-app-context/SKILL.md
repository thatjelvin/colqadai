---
name: colqad-app-context
description: 'Colqad product context and decision skill. Use when tasks involve Colqad features, architecture, user flows, learning science methods, spaced repetition, interleaved practice, active recall/retrieval practice, AI tutoring, summarization, concept explanations, worked examples, error analysis, content generation logic, UX copy, product decisions, or debugging product logic.'
argument-hint: 'Task context: feature, flow, copy, architecture, or bug area'
user-invocable: true
---

# Colqad App Context

## Purpose
Provide persistent product context so any agent working on Colqad makes decisions consistent with the app's learning science foundation and long-term vision.

## Product Definition
Colqad is a research-backed math learning web app for university students (primarily STEM).

Colqad is not just one of these:
- A flashcard app
- A chatbot tutor
- A summarizer

Colqad combines all three learning mechanisms around the student's own source material:
- Retrieval practice (active recall)
- Spaced repetition
- Interleaved practice

## Core User Journey
Use this flow as the baseline for architecture, UX, and feature decisions.

1. Source Input
- User uploads learning materials: PDFs, YouTube links, slides, docs, plain text.
- If user has no source, app may fetch relevant material from the web.

2. Summarization
- Convert uploaded/fetched material into digestible summaries.
- Extract key concepts per topic.

3. Concept Explanation
- Generate concise concept explanations.
- Add short worked examples.
- Avoid textbook-style long-form output.

4. Practice (Working Out)
- Present questions the user must attempt.
- Active recall is required before reveal.

5. Spaced Repetition
- Schedule concept/problem reviews at optimal intervals.

6. Interleaved Practice
- Mix questions across topics over time.
- Avoid blocked "single-topic-only" loops when generating practice sessions.

## Decision Rules
Apply these rules whenever you propose, implement, or review changes.

1. Keep the flow cohesive
- Do not design isolated features that break Source -> Summary -> Explain -> Practice -> Schedule -> Interleave continuity.

2. Prefer retrieval over passive consumption
- Require attempts before solutions/hints where possible.
- "Read-only" study should be secondary to generation/recall.

3. Preserve long-term retention mechanics
- Protect spacing and interleaving in defaults.
- Avoid convenience options that encourage blocking.

4. Keep explanations concise and actionable
- Explanations should be brief, clear, and directly tied to problem-solving.

5. Ground output in user materials
- Prioritize user-provided sources.
- Use web-fetched content only as fallback/augmentation.

6. Build for university-level math rigor
- Use mathematically correct notation and reasoning.
- Keep language accessible without oversimplifying.

## Branching Logic For Product/Engineering Tasks

### A. If task is feature design or architecture
1. Map feature to one or more journey stages.
2. State how it reinforces retrieval + spacing + interleaving.
3. Define success metrics tied to retention/engagement.

### B. If task is UI copy/content generation
1. Keep copy concise, direct, and confidence-building.
2. Emphasize active practice behavior.
3. Avoid generic "AI tutor" framing that ignores learning science.

### C. If task is debugging product logic
1. Identify broken journey stage first.
2. Check if bug weakens active recall, spacing, or interleaving.
3. Prioritize fixes that restore learning outcomes, not only UI correctness.

### D. If task is prioritization/product tradeoffs
1. Prefer options that increase learning effectiveness over short-term convenience.
2. Reject changes that collapse the app into a pure chatbot or passive summary tool.

## Quality Checks (Definition of Done)
Before finalizing any Colqad-related task, verify:

1. Vision alignment
- The change keeps Colqad as an integrated learning system, not a fragmented toolset.

2. Learning-science alignment
- Retrieval practice, spacing, and interleaving are either improved or preserved.

3. Journey continuity
- The user can still move from sources to explanations to practice to scheduled mixed reviews.

4. User fit
- Output is appropriate for university STEM learners and math-heavy coursework.

5. Clarity
- Explanations and UX copy are concise and actionable.

## Example Anchor Use Case
A Calculus 2 student uploads a PDF. Colqad extracts concepts (for example, integration by parts and series convergence), explains each briefly with short examples, gives practice questions, then schedules future reviews using spaced repetition and mixes them with other topics using interleaving.

## Invocation Prompts
Use this skill for prompts such as:
- "Design the practice flow for a new Colqad topic module."
- "Review this PR for alignment with Colqad learning science principles."
- "Write concise onboarding copy that explains Colqad without sounding like a generic AI tutor."
- "Debug why users are seeing blocked topic practice instead of mixed sessions."
- "Refactor this feature so it reinforces retrieval first, then feedback."
