import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { calculateSM2, type Rating } from "@/lib/sm2";
import { randomUUID } from "crypto";

type DbRecord = Record<string, unknown>;

/**
 * Add a concept for review or update its review state.
 * If the concept does not exist for the user, it will be created with initial SM-2 values.
 * If it exists, it will be updated based on the user's performance (correct or not).
 *
 * @param userId The user's ID
 * @param concept The concept string
 * @param correct Whether the user correctly recalled/understood the concept
 * @param quality The quality of recall (0-5) as per SM-2. If not provided, it is derived from correct.
 */
export async function addConceptForReview(
  userId: string,
  concept: string,
  correct: boolean,
  quality?: number
): Promise<void> {
  await getOrCreateUserForSupabaseId(userId, "", "", "");

  // Check if the concept already exists for the user
  const existing = await (db.conceptReview as DbModelDelegate).findFirst({
    where: {
      userId,
      concept,
    },
  }) as DbRecord | null;

  const now = new Date();

  if (existing) {
    // Update existing concept review
    const ex = existing as unknown as ConceptReviewShape;
    let newInterval = ex.interval;
    let newRepetitionCount = ex.repetitionCount;
    let newEfFactor = ex.efFactor;
    let newNextReviewAt = ex.nextReviewAt;

    if (correct) {
      const rating = (quality ?? 5) as Rating;
      const sm2Result = calculateSM2(
        {
          interval: ex.interval,
          repetitions: ex.repetitionCount,
          easeFactor: ex.efFactor,
        },
        rating
      );
      newInterval = sm2Result.interval;
      newRepetitionCount = sm2Result.repetitions;
      newEfFactor = sm2Result.easeFactor;
      newNextReviewAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
    } else {
      newRepetitionCount = 0;
      newInterval = 0;
      newEfFactor = 1.3;
      newNextReviewAt = new Date(now.getTime());
    }

    await (db.conceptReview as DbModelDelegate).update({
      where: { id: ex.id },
      data: {
        interval: newInterval,
        repetitionCount: newRepetitionCount,
        efFactor: newEfFactor,
        nextReviewAt: newNextReviewAt,
        updatedAt: now,
      },
    });
  } else {
    let initialInterval = 0;
    let initialRepetition = 0;
    let initialEf = 2.5;
    let initialNextReview = now;

    if (correct) {
      initialInterval = 1;
      initialRepetition = 1;
      const rating = 4 as Rating;
      const sm2Result = calculateSM2(
        { interval: 0, repetitions: 0, easeFactor: 2.5 },
        rating
      );
      initialInterval = sm2Result.interval;
      initialRepetition = sm2Result.repetitions;
      initialEf = sm2Result.easeFactor;
      initialNextReview = new Date(now.getTime() + initialInterval * 24 * 60 * 60 * 1000);
    }

    await (db.conceptReview as DbModelDelegate).create({
      data: {
        id: randomUUID(),
        userId,
        concept,
        interval: initialInterval,
        repetitionCount: initialRepetition,
        efFactor: initialEf,
        nextReviewAt: initialNextReview,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}

/**
 * Get the concepts that are due for review for a user.
 * @param userId The user's ID
 * @returns An array of concept review items that are due (nextReviewAt <= now)
 */
export async function getDueConceptReviews(userId: string): Promise<Array<{ id: string; concept: string }>> {
  const now = new Date();
  const due = await (db.conceptReview as DbModelDelegate).findMany({
    where: {
      userId,
      nextReviewAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      concept: true,
    },
    orderBy: {
      nextReviewAt: "asc",
    },
  }) as DbRecord[];

  return due.map(item => ({
    id: item.id as string,
    concept: item.concept as string,
  }));
}

/**
 * Get all concept review items for a user (for debugging or admin).
 */
export async function getAllConceptReviews(userId: string): Promise<Array<{
  id: string;
  concept: string;
  interval: number;
  repetitionCount: number;
  efFactor: number;
  nextReviewAt: Date;
}>> {
  return await (db.conceptReview as DbModelDelegate).findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      concept: true,
      interval: true,
      repetitionCount: true,
      efFactor: true,
      nextReviewAt: true,
    },
    orderBy: {
      nextReviewAt: "asc",
    },
  }) as Array<{
    id: string;
    concept: string;
    interval: number;
    repetitionCount: number;
    efFactor: number;
    nextReviewAt: Date;
  }>;
}

// Internal helpers
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
  delete(args?: Record<string, unknown>): Promise<DbRecord>;
  count(args?: Record<string, unknown>): Promise<number>;
};

interface ConceptReviewShape {
  id: string;
  concept: string;
  interval: number;
  repetitionCount: number;
  efFactor: number;
  nextReviewAt: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
