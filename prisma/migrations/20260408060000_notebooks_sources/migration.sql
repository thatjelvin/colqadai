-- Notebook and source-ingestion domain models

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotebookSourceType') THEN
    CREATE TYPE "NotebookSourceType" AS ENUM ('TEXT', 'PDF');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotebookIngestionStatus') THEN
    CREATE TYPE "NotebookIngestionStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Notebook" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notebook_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notebook_userId_updatedAt_idx"
  ON "Notebook"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "NotebookDocument" (
  "id" TEXT PRIMARY KEY,
  "notebookId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceType" "NotebookSourceType" NOT NULL,
  "mimeType" TEXT,
  "byteSize" INTEGER,
  "rawText" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "ingestionStatus" "NotebookIngestionStatus" NOT NULL DEFAULT 'PROCESSED',
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "charCount" INTEGER NOT NULL DEFAULT 0,
  "storageMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotebookDocument_notebookId_fkey"
    FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotebookDocument_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NotebookDocument_notebookId_createdAt_idx"
  ON "NotebookDocument"("notebookId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotebookDocument_userId_createdAt_idx"
  ON "NotebookDocument"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "NotebookChunk" (
  "id" TEXT PRIMARY KEY,
  "notebookId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "charCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotebookChunk_notebookId_fkey"
    FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotebookChunk_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "NotebookDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotebookChunk_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotebookChunk_documentId_chunkIndex_key"
  ON "NotebookChunk"("documentId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "NotebookChunk_notebookId_chunkIndex_idx"
  ON "NotebookChunk"("notebookId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "NotebookChunk_userId_createdAt_idx"
  ON "NotebookChunk"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "NotebookSummary" (
  "id" TEXT PRIMARY KEY,
  "notebookId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "keyPoints" JSONB,
  "sourceChunkIds" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotebookSummary_notebookId_fkey"
    FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotebookSummary_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NotebookSummary_notebookId_createdAt_idx"
  ON "NotebookSummary"("notebookId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotebookSummary_userId_createdAt_idx"
  ON "NotebookSummary"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "NotebookConcept" (
  "id" TEXT PRIMARY KEY,
  "notebookId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "evidenceChunkIds" JSONB,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotebookConcept_notebookId_fkey"
    FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotebookConcept_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NotebookConcept_notebookId_createdAt_idx"
  ON "NotebookConcept"("notebookId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotebookConcept_userId_createdAt_idx"
  ON "NotebookConcept"("userId", "createdAt");
