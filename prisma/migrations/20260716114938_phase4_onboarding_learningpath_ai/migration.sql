-- Phase 4.1-4.5: Onboarding quiz, learning path, AI-generated problems, misconception tracking, concept review

-- Add AI-generated flag to Problem table
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "aiGenerated" BOOLEAN NOT NULL DEFAULT FALSE;

-- Onboarding questions (static bank)
CREATE TABLE IF NOT EXISTS "OnboardingQuestion" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL CHECK ("difficulty" IN ('EASY','MEDIUM','HARD')),
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- User onboarding results
CREATE TABLE IF NOT EXISTS "UserOnboardingResult" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "answers" JSONB NOT NULL,
    "initialTopic" TEXT,
    "initialDifficulty" TEXT CHECK ("initialDifficulty" IN ('EASY','MEDIUM','HARD')),
    "goal" TEXT,
    "pace" TEXT CHECK ("pace" IN ('SLOW','MODERATE','FAST')),
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId")
);

-- Learning paths
CREATE TABLE IF NOT EXISTS "LearningPath" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Learning path nodes
CREATE TABLE IF NOT EXISTS "LearningPathNode" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "learningPlanId" TEXT NOT NULL REFERENCES "LearningPath"("id") ON DELETE CASCADE,
    "topicSlug" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "orderInWeek" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK ("status" IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
    "masteryTarget" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "estimatedMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "OnboardingQuestion_topic_idx" ON "OnboardingQuestion"("topic");
CREATE INDEX IF NOT EXISTS "UserOnboardingResult_userId_idx" ON "UserOnboardingResult"("userId");
CREATE INDEX IF NOT EXISTS "LearningPath_userId_idx" ON "LearningPath"("userId");
CREATE INDEX IF NOT EXISTS "LearningPathNode_learningPlanId_idx" ON "LearningPathNode"("learningPlanId");
CREATE INDEX IF NOT EXISTS "LearningPathNode_topicSlug_idx" ON "LearningPathNode"("topicSlug");

-- Misconception tracking (per user, topic, error type)
CREATE TABLE IF NOT EXISTS "UserMisconceptionTracking" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "topicSlug" TEXT NOT NULL,
    "errorType" TEXT NOT NULL CHECK ("errorType" IN ('CONCEPTUAL_GAP','ALGEBRAIC_SLIP','MISREAD_QUESTION','FORMULA_RECALL_FAILURE','WRONG_METHOD_CHOSEN')),
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    UNIQUE ("userId", "topicSlug", "errorType")
);

-- Concept review (spaced repetition for notebook concepts)
CREATE TABLE IF NOT EXISTS "ConceptReview" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "notebookConceptId" TEXT NOT NULL REFERENCES "NotebookConcept"("id") ON DELETE CASCADE,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes for concept review
CREATE INDEX IF NOT EXISTS "ConceptReview_notebookConceptId_idx" ON "ConceptReview"("notebookConceptId");
CREATE INDEX IF NOT EXISTS "ConceptReview_nextReviewAt_idx" ON "ConceptReview"("nextReviewAt");