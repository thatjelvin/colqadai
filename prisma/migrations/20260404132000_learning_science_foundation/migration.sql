-- Foundation schema for Colqad learning-science features

ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "topic_tag" TEXT;
ALTER TABLE "UserProblem" ADD COLUMN IF NOT EXISTS "attempts_before_correct" INTEGER NOT NULL DEFAULT 0;

UPDATE "Problem" p
SET "topic_tag" = t."slug"
FROM "Topic" t
WHERE p."topicId" = t."id" AND p."topic_tag" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ErrorType') THEN
    CREATE TYPE "ErrorType" AS ENUM (
      'CONCEPTUAL_GAP',
      'ALGEBRAIC_SLIP',
      'MISREAD_QUESTION',
      'FORMULA_RECALL_FAILURE',
      'WRONG_METHOD_CHOSEN'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LearningMethod') THEN
    CREATE TYPE "LearningMethod" AS ENUM (
      'SPACED_REPETITION',
      'RETRIEVAL_PRACTICE',
      'INTERLEAVED_PRACTICE',
      'ELABORATIVE_INTERROGATION',
      'WORKED_EXAMPLE_STUDY',
      'ERROR_ANALYSIS'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProblemAttempt" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "userProblemId" TEXT,
  "userAnswer" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT FALSE,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "attempts_before_correct" INTEGER NOT NULL DEFAULT 0,
  "self_quiz_mode" BOOLEAN NOT NULL DEFAULT FALSE,
  "error_type" "ErrorType",
  "error_explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProblemAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProblemAttempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProblemAttempt_userProblemId_fkey" FOREIGN KEY ("userProblemId") REFERENCES "UserProblem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProblemAttempt_userId_createdAt_idx" ON "ProblemAttempt"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProblemAttempt_problemId_createdAt_idx" ON "ProblemAttempt"("problemId", "createdAt");

CREATE TABLE IF NOT EXISTS "Reflection" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "attemptId" TEXT,
  "prompt" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reflection_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reflection_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ProblemAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Reflection_userId_createdAt_idx" ON "Reflection"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "WorkedExampleSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "userProblemId" TEXT,
  "study_duration_seconds" INTEGER NOT NULL DEFAULT 0,
  "generate_attempt" TEXT,
  "self_assessed_match" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkedExampleSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkedExampleSession_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkedExampleSession_userProblemId_fkey" FOREIGN KEY ("userProblemId") REFERENCES "UserProblem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WorkedExampleSession_userId_createdAt_idx" ON "WorkedExampleSession"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" TEXT PRIMARY KEY,
  "feature_name" TEXT NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

INSERT INTO "feature_flags" ("id", "feature_name", "enabled", "created_at", "updated_at")
VALUES
  ('ff_spaced_repetition', 'spaced_repetition', TRUE, NOW(), NOW()),
  ('ff_retrieval_practice', 'retrieval_practice', TRUE, NOW(), NOW()),
  ('ff_interleaved_practice', 'interleaved_practice', TRUE, NOW(), NOW()),
  ('ff_elaborative_interrogation', 'elaborative_interrogation', TRUE, NOW(), NOW()),
  ('ff_worked_example_study', 'worked_example_study', TRUE, NOW(), NOW()),
  ('ff_error_analysis', 'error_analysis', TRUE, NOW(), NOW())
ON CONFLICT ("feature_name") DO NOTHING;

CREATE TABLE IF NOT EXISTS "learning_analytics" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "session_key" TEXT NOT NULL,
  "method" "LearningMethod" NOT NULL,
  "aggregate" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "learning_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "learning_analytics_userId_session_key_method_key"
  ON "learning_analytics"("userId", "session_key", "method");

CREATE INDEX IF NOT EXISTS "learning_analytics_userId_createdAt_idx"
  ON "learning_analytics"("userId", "createdAt");
