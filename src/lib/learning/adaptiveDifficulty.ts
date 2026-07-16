/**
 * Adaptive difficulty engine.
 *
 * Analyzes recent performance and SM-2 state to suggest the optimal problem
 * difficulty for the user's current zone of proximal development (~85% success rate).
 */

import { db } from "@/lib/db";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};
type PrismaLikeClient = {
  problemAttempt: DbModelDelegate;
  userProblem: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

export type SuggestedDifficulty = "EASY" | "MEDIUM" | "HARD";

export type AdaptiveDifficultyResult = {
  suggestedDifficulty: SuggestedDifficulty;
  successRate: number;
  recentAttemptCount: number;
  averageEaseFactor: number;
};

/**
 * Get the suggested difficulty based on recent performance and SM-2 state.
 *
 * Success rate logic:
 *   > 90% → HARD (push the boundary)
 *   < 70% → EASY (back to foundation)
 *   otherwise → MEDIUM (maintain)
 *
 * Also factors in average SM-2 ease factor as a modifier.
 */
export async function getAdaptiveDifficulty(
  userId: string
): Promise<AdaptiveDifficultyResult> {
  const recentAttempts = (await dbClient.problemAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })) as DbRecord[];

  const total = recentAttempts.length;
  const correctCount = recentAttempts.filter((a) => a.isCorrect).length;
  const successRate = total > 0 ? (correctCount / total) * 100 : 0;

  // Calculate average SM-2 ease factor from user problems
  const userProblems = (await dbClient.userProblem.findMany({
    where: { userId },
  })) as DbRecord[];

  const easeFactors = userProblems
    .map((up) => up.easeFactor as number)
    .filter((ef) => ef > 0);

  const averageEaseFactor =
    easeFactors.length > 0
      ? easeFactors.reduce((sum, ef) => sum + ef, 0) / easeFactors.length
      : 2.5;

  // Determine difficulty
  let suggestedDifficulty: SuggestedDifficulty = "MEDIUM";

  if (total === 0) {
    suggestedDifficulty = "MEDIUM";
  } else if (successRate > 90) {
    suggestedDifficulty = "HARD";
  } else if (successRate < 70) {
    suggestedDifficulty = "EASY";
  }

  // Boost to HARD if ease factor is very high (user learns fast)
  if (averageEaseFactor >= 3.0 && suggestedDifficulty !== "HARD") {
    suggestedDifficulty = "HARD";
  }

  // Drop to MEDIUM (not EASY) if ease factor is very low but keeps it maintainable
  if (averageEaseFactor <= 1.8 && suggestedDifficulty === "HARD") {
    suggestedDifficulty = "MEDIUM";
  }

  return {
    suggestedDifficulty,
    successRate: Math.round(successRate),
    recentAttemptCount: total,
    averageEaseFactor: Math.round(averageEaseFactor * 100) / 100,
  };
}

/**
 * Priority sort comparator for difficulty proximity.
 * Problems at the suggested difficulty sort first, then adjacent difficulties.
 */
export function difficultyPriority(
  a: string | undefined,
  b: string | undefined,
  suggested: SuggestedDifficulty
): number {
  const order: Record<string, number> = {
    EASY: 0,
    MEDIUM: 1,
    HARD: 2,
  };

  const ideal = order[suggested] ?? 1;
  const orderA = order[a ?? ""] ?? (a ? 99 : 99);
  const orderB = order[b ?? ""] ?? (b ? 99 : 99);

  const distA = Math.abs(orderA - ideal);
  const distB = Math.abs(orderB - ideal);

  return distA - distB;
}
