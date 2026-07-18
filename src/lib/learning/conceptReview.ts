import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { calculateSM2 } from "@/lib/sm2";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
};
const dbClient = db as unknown as { conceptReview: DbModelDelegate };

type ConceptReviewRecord = {
  id: string;
  userId: string;
  concept: string;
  interval: number;
  repetitionCount: number;
  efFactor: number;
  nextReviewAt: Date;
};

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
  // Get or create the user's profile to ensure they exist
  await getOrCreateUserForSupabaseId(userId, "", "", "");

  // Check if the concept already exists for the user
  const existing = await dbClient.conceptReview.findFirst({
    where: {
      userId,
      concept,
    },
  }) as ConceptReviewRecord | null;

  const now = new Date();

  if (existing) {
    // Update existing concept review
    let newInterval = existing.interval;
    let newRepetitionCount = existing.repetitionCount;
    let newEfFactor = existing.efFactor;
    let newNextReviewAt = existing.nextReviewAt;

    if (correct) {
      // Use the SM-2 algorithm to update the interval, repetition count, and EF
      const sm2Result = calculateSM2(
        {
          interval: existing.interval,
          repetitions: existing.repetitionCount,
          easeFactor: existing.efFactor,
        },
        (quality ?? (correct ? 5 : 1)) as 0 | 1 | 2 | 3 | 4 | 5
      );
      const interval = sm2Result.interval;
      const repetition = sm2Result.repetitions;
      const ef = sm2Result.easeFactor;
      newInterval = interval;
      newRepetitionCount = repetition;
      newEfFactor = ef;
      newNextReviewAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    } else {
      // If incorrect, reset the repetition count and set interval to 0 (review again soon)
      newRepetitionCount = 0;
      newInterval = 0;
      newEfFactor = 1.3; // EF decreases when forgetting
      newNextReviewAt = new Date(now.getTime()); // Review immediately (or we could set to a short interval)
    }

    await dbClient.conceptReview.update({
      where: { id: existing.id },
      data: {
        interval: newInterval,
        repetitionCount: newRepetitionCount,
        efFactor: newEfFactor,
        nextReviewAt: newNextReviewAt,
        updatedAt: now,
      },
    });
  } else {
    // Create a new concept review entry
    // Initial state: interval = 0, repetitionCount = 0, efFactor = 2.5
    // If correct, we still start with interval 0? Or we can set to 1 day if correct.
    // According to SM-2, the first review after learning is usually after 1 day if correct.
    // But we'll let the first review be immediate (interval 0) and then update after the first review.
    // Alternatively, we can set the initial state based on correctness.
    let initialInterval = 0;
    let initialRepetition = 0;
    let initialEf = 2.5;
    let initialNextReview = now;

    if (correct) {
      // If the user knows it already, we can set the first interval to 1 day
      initialInterval = 1;
      initialRepetition = 1;
      // EF stays at 2.5 for now? Actually, after the first review, we update EF based on quality.
      // We'll set it as if they had a quality of 4 (good) on the first review.
      const sm2Result = calculateSM2(
        {
          interval: 0,
          repetitions: 0,
          easeFactor: 2.5,
        },
        4
      );
      const interval = sm2Result.interval;
      const repetition = sm2Result.repetitions;
      const ef = sm2Result.easeFactor;
      initialInterval = interval;
      initialRepetition = repetition;
      initialEf = ef;
      initialNextReview = new Date(now.getTime() + initialInterval * 24 * 60 * 60 * 1000);
    }

    await dbClient.conceptReview.create({
      data: {
        id: crypto.randomUUID(),
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
  const due = await dbClient.conceptReview.findMany({
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
  }) as Array<{ id: string; concept: string }>;

  return due.map((item) => ({
    id: item.id,
    concept: item.concept,
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
  return await dbClient.conceptReview.findMany({
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