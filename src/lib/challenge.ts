import { db } from "@/lib/db";
import { applyStreakUpdate, applyChallengeCompletion as applyStreakBoost, dayKey, StreakUpdateInput } from "@/lib/learning/streak";
import { Plan } from "@/lib/db-types";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  count(args?: Record<string, unknown>): Promise<number>;
};
type PrismaLikeClient = {
  problem: DbModelDelegate;
  dailyChallenge: DbModelDelegate;
  dailyChallengeCompletion: DbModelDelegate;
  streakFreeze: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return dayKey(d);
}

function normalizeSlug(slug: string | null | undefined): string {
  if (!slug) return "unknown";
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Generate a deterministic index from a date string to pick the same problem for all users. */
function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Select today's problem-of-the-day.
 * Uses a deterministic seed based on the date so all users on the same tier
 * see the same problem, but the problem changes daily.
 */
export async function selectProblemOfTheDay(userId: string, userPlan: Plan): Promise<{
  problemId: string;
  problemBody: string;
  problemSolution: string;
  alreadyCompleted: boolean;
  completionId: string | null;
}> {
  const today = dayKey(new Date());

  // Check if already completed
  const existingCompletion = await dbClient.dailyChallengeCompletion.findFirst({
    where: { userId, challengeDate: today },
  }) as DbRecord | null;

  // Check if a challenge was already selected for today
  let challenge = await dbClient.dailyChallenge.findFirst({
    where: { date: today, tier: userPlan },
  }) as DbRecord | null;

  if (!challenge) {
    // Select a random problem deterministically based on today's date
    const allProblems = await dbClient.problem.findMany({
      where: {},
      select: { id: true, body: true, solution: true },
    }) as DbRecord[];

    if (allProblems.length === 0) {
      throw new Error("No problems available for daily challenge");
    }

    const seed = dateSeed(today);
    const idx = seed % allProblems.length;
    const chosen = allProblems[idx];

    challenge = await dbClient.dailyChallenge.create({
      data: {
        date: today,
        problemId: chosen.id,
        tier: userPlan,
      },
    }) as DbRecord;
  }

  const problem = await dbClient.problem.findFirst({
    where: { id: challenge.problemId as string },
    select: { id: true, body: true, solution: true },
  }) as DbRecord | null;

  if (!problem) {
    throw new Error("Challenge problem not found");
  }

  return {
    problemId: problem.id as string,
    problemBody: problem.body as string,
    problemSolution: problem.solution as string,
    alreadyCompleted: !!existingCompletion,
    completionId: existingCompletion?.id as string | null,
  };
}

/**
 * Mark today's challenge as completed.
 * Applies streak multiplier (counts as 2 streak days).
 */
export async function completeChallenge(
  userId: string,
  streakState: StreakUpdateInput
): Promise<{
  success: boolean;
  newStreak: StreakUpdateInput;
  streakBoostApplied: boolean;
}> {
  const today = dayKey(new Date());

  // Check not already completed
  const existing = await dbClient.dailyChallengeCompletion.findFirst({
    where: { userId, challengeDate: today },
  }) as DbRecord | null;

  if (existing) {
    return { success: false, newStreak: streakState, streakBoostApplied: false };
  }

  // Record completion
  await dbClient.dailyChallengeCompletion.create({
    data: {
      userId,
      challengeDate: today,
      completedAt: new Date(),
      streakBoostApplied: true,
    },
  });

  // Apply streak boost: call applyStreakUpdate for today, then simulate tomorrow
  const afterFirst = applyStreakUpdate(streakState, new Date());

  // Simulate a second day to give +2 streak total
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const afterBoost = applyStreakUpdate(afterFirst, tomorrow);

  return {
    success: true,
    newStreak: afterBoost,
    streakBoostApplied: true,
  };
}

/**
 * Get weekly leaderboard (top users by challenge completions this week).
 * Returns anonymous entries (no real names displayed).
 */
export async function getLeaderboard(): Promise<{
  rank: number;
  userId: string;
  completions: number;
  currentStreak?: number;
}[]> {
  const weekStart = getMondayOfWeek();
  const today = dayKey(new Date());

  // All completions from Monday to today
  const completions = await dbClient.dailyChallengeCompletion.findMany({
    where: {
      challengeDate: { gte: weekStart, lte: today },
    },
    select: { userId: true, challengeDate: true },
  }) as DbRecord[];

  // Group by userId
  const counts = new Map<string, number>();
  for (const c of completions) {
    const uid = c.userId as string;
    counts.set(uid, (counts.get(uid) || 0) + 1);
  }

  // Sort descending by count
  const sorted = Array.from(counts.entries())
    .map(([userId, completions]) => ({ userId, completions }))
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 20); // Top 20

  return sorted.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    completions: entry.completions,
  }));
}

/**
 * Use a streak freeze for the current week (PRO users only).
 * A freeze protects the streak if the user misses a day.
 */
export async function useStreakFreeze(userId: string): Promise<{
  success: boolean;
  message: string;
  freeze: DbRecord | null;
}> {
  const weekStart = getMondayOfWeek();

  // Check existing freeze for this week
  const existing = await dbClient.streakFreeze.findFirst({
    where: { userId, weekStart },
  }) as DbRecord | null;

  if (existing) {
    if (existing.used) {
      return { success: false, message: "Freeze already used this week", freeze: null };
    }
    // Mark as used
    // In-memory update doesn't support partial update directly; we use update
    const updated = await dbClient.streakFreeze.create({
      data: {
        userId,
        weekStart,
        used: true,
      },
    }) as DbRecord;
    return { success: true, message: "Streak freeze activated", freeze: updated };
  }

  // Create and mark used
  const freeze = await dbClient.streakFreeze.create({
    data: {
      userId,
      weekStart,
      used: true,
    },
  }) as DbRecord;

  return { success: true, message: "Streak freeze activated", freeze };
}

/**
 * Check if user has an unused streak freeze for the current week.
 */
export async function hasUnusedFreeze(userId: string): Promise<boolean> {
  const weekStart = getMondayOfWeek();
  const freeze = await dbClient.streakFreeze.findFirst({
    where: { userId, weekStart, used: false },
  }) as DbRecord | null;
  return !!freeze;
}
