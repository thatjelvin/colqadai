# COLQAD — Phases 3–5 Roadmap

> All of Phase 1 (growth mindset, student context, prerequisites, streak milestones) and Phase 2 (Socratic mode, adaptive difficulty) are complete.

---

## Phase 3 — Engagement & Retention

### 3.1 Daily Challenge Mode
- One curated "problem of the day" per user, same for everyone on the same tier
- Streak multiplier for completing the daily challenge (2x streak day)
- Leaderboard: weekly top streaks (anonymous, opt-in) for social accountability
- Streak freeze item: 1 free skip per week for PRO users

### 3.2 Spaced Repetition Review Dashboard
- Visual calendar heatmap (like GitHub contributions) showing review days
- Forecast: "Due in 2 days, 5 days, 12 days" per problem
- Review queue with priority scoring (overdue days × ease factor × difficulty)
- "Cram mode" — ignores spacing, surfaces all due problems sorted by urgency

### 3.3 Gamified Mastery Tree
- Topic map rendered as an interactive tree/graph (prerequisite → topic branches)
- Each node shows mastery percentage + completion checkmark at 100%
- Unlock animation when a topic reaches MASTERED
- "Next recommended topic" suggestion based on prerequisites + current mastery

### 3.4 Push Notification Reminders
- Daily at configurable time: "You have N problems due for review"
- Streak-at-risk notification if no review by 8pm local
- Milestone congratulations at 7/14/30/50/100 days
- Weekly summary: "You solved X problems this week, Y% correct"

---

## Phase 4 — Personalization & AI

### 4.1 Onboarding Quiz
- 10-question diagnostic covering core topics (arithmetic → calculus)
- Initial topic placement and difficulty calibration based on results
- Goal setting: "I want to..." → exam prep, course support, self-study, etc.
- Learning pace preference: relaxed, balanced, intensive

### 4.2 Personalized Learning Path
- Auto-generated sequence of topics based on:
  - Onboarding quiz gaps
  - Prerequisite completion
  - Performance trajectory (speeding up → advance faster, struggling → reinforce)
- Weekly plan: "This week you'll focus on derivatives and integrals"
- Re-plan on demand if user feels off-track

### 4.3 AI-Generated Problem Generator (Evolution)
- Current: static problem bank. Phase 4: LLM generates fresh problems on-demand
- Template system: `∫[a]^[b] [polynomial] dx` → infinite variants
- Difficulty calibration: generate at the user's exact adaptive difficulty level
- Topic coverage: ensure interleaving across all active topics

### 4.4 Misconception Detection
- Track error type patterns across sessions (not just single attempts)
- When a user makes the same `CONCEPTUAL_GAP` error 3+ times on the same topic:
  - Surface a targeted micro-lesson
  - Suggest a different topic approach
  - Alert the AI tutor to preemptively address the misconception
- "Common mistake" sidebar on relevant problems

### 4.5 Spaced Repetition for AI Tutor Concepts
- After a chat session, extract key concepts discussed
- Schedule those concepts as micro-review items
- "Remember when we talked about eigenvalues last week? Quick check..."

---

## Phase 5 — Social & Monetization

### 5.1 Study Groups
- Users can create or join study groups by topic
- Shared progress dashboard within group
- Group challenge: "Complete this topic set together by Friday"
- In-group chat (opt-in, with AI moderation)

### 5.2 Community Solutions
- After solving a problem, browse how others solved it (anonymous)
- Upvote helpful approaches
- "Alternative method" badge for contributing a novel solution path
- Report inappropriate content

### 5.3 Tier Expansion
- **FREE**: 10 problems/day, basic chat, no daily challenge multiplayer
- **PRO** ($6.99/mo): unlimited problems, Socratic tutor, full analytics, streak freezes
- **MAX** ($16.99/mo): AI problem generator, study groups, priority LLM queue
- **LIFETIME** ($199): one-time, forever MAX

### 5.4 Shareable Progress Cards
- "I've solved 150 calculus problems this month" — social media share image
- Streak milestones as shareable cards
- Topic mastery certificate at 100% (PDF download)
- Referral program: 1 month PRO per referral

---

## Implementation Order (Recommended)

```
Phase 3 (Engagement) → Phase 4 (Personalization) → Phase 5 (Social)
```

Phase 3 first because it improves retention of existing users with the least new surface area. Phase 4 depends on having enough user data (attempts, error patterns) which Phase 3's engagement will generate. Phase 5 is additive on top of a sticky product.

**Quickest wins in Phase 3:** 3.2 (review dashboard — build on existing SM-2 data), 3.3 (mastery tree — build on prerequisite graph already built), 3.4 (notifications — standalone feature).
