import { db } from "@/lib/db";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  delete(args?: Record<string, unknown>): Promise<DbRecord>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
};
type PrismaLikeClient = {
  communitySolution: DbModelDelegate;
  solutionVote: DbModelDelegate;
  solutionReport: DbModelDelegate;
  problemAttempt: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

export interface SolutionData {
  id: string;
  problemId: string;
  solution: string;
  isAlternativeMethod: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  userVote: "UP" | "DOWN" | "NONE";
  isOwn: boolean;
}

/**
 * Submit a solution for a problem.
 * Requires the user to have at least one attempt recorded for the problem.
 */
export async function submitSolution(
  userId: string,
  problemId: string,
  solution: string,
  isAlternativeMethod: boolean = false
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Check user has attempted this problem
  const attempt = await dbClient.problemAttempt.findFirst({
    where: { userId, problemId },
    select: { id: true },
  }) as DbRecord | null;

  if (!attempt) {
    return { success: false, error: "You must attempt the problem before submitting a solution." };
  }

  // Check not already submitted
  const existing = await dbClient.communitySolution.findFirst({
    where: { userId, problemId },
    select: { id: true },
  }) as DbRecord | null;

  if (existing) {
    return { success: false, error: "You have already submitted a solution for this problem." };
  }

  const record = await dbClient.communitySolution.create({
    data: {
      problemId,
      userId,
      solution,
      isAlternativeMethod,
      upvotes: 0,
      downvotes: 0,
    },
  }) as DbRecord;

  return { success: true, id: record.id as string };
}

/**
 * Get all solutions for a problem, sorted by upvotes descending.
 * Returns anonymous data with the current user's vote status.
 */
export async function getSolutions(
  problemId: string,
  currentUserId: string
): Promise<SolutionData[]> {
  const raw = await dbClient.communitySolution.findMany({
    where: { problemId },
    select: {
      id: true,
      problemId: true,
      userId: true,
      solution: true,
      isAlternativeMethod: true,
      upvotes: true,
      downvotes: true,
      createdAt: true,
    },
    orderBy: { upvotes: "desc" },
  }) as DbRecord[];

  const results: SolutionData[] = [];

  for (const r of raw) {
    const rId = r.id as string;
    const rUserId = r.userId as string;

    // Get current user's vote
    const vote = await dbClient.solutionVote.findFirst({
      where: { userId: currentUserId, solutionId: rId },
      select: { voteType: true },
    }) as DbRecord | null;

    results.push({
      id: rId,
      problemId: r.problemId as string,
      solution: r.solution as string,
      isAlternativeMethod: r.isAlternativeMethod as boolean,
      upvotes: (r.upvotes as number) ?? 0,
      downvotes: (r.downvotes as number) ?? 0,
      createdAt: (r.createdAt as Date).toISOString(),
      userVote: (vote?.voteType as "UP" | "DOWN") ?? "NONE",
      isOwn: rUserId === currentUserId,
    });
  }

  return results;
}

/**
 * Vote on a solution (toggle behavior).
 * If voting the same way, removes the vote (NONE).
 * If voting differently, switches the vote.
 */
export async function voteSolution(
  userId: string,
  solutionId: string,
  voteType: "UP" | "DOWN"
): Promise<{ success: boolean; newUpvotes: number; newDownvotes: number; newVote: "UP" | "DOWN" | "NONE" }> {
  const solution = await dbClient.communitySolution.findFirst({
    where: { id: solutionId },
    select: { id: true, upvotes: true, downvotes: true },
  }) as DbRecord | null;

  if (!solution) {
    return { success: false, newUpvotes: 0, newDownvotes: 0, newVote: "NONE" };
  }

  let currentUpvotes = (solution.upvotes as number) ?? 0;
  let currentDownvotes = (solution.downvotes as number) ?? 0;

  const existingVote = await dbClient.solutionVote.findFirst({
    where: { userId, solutionId },
    select: { voteType: true },
  }) as DbRecord | null;

  const currentVote = (existingVote?.voteType as "UP" | "DOWN") ?? null;

  if (currentVote === voteType) {
    // Toggle off
    // Delete the vote record
    const votes = await dbClient.solutionVote.findMany({
      where: { userId, solutionId },
    }) as DbRecord[];
    for (const v of votes) {
      await dbClient.solutionVote.delete({ where: { id: v.id } });
    }

    if (voteType === "UP") currentUpvotes = Math.max(0, currentUpvotes - 1);
    else currentDownvotes = Math.max(0, currentDownvotes - 1);

    await dbClient.communitySolution.update({
      where: { id: solutionId },
      data: { upvotes: currentUpvotes, downvotes: currentDownvotes },
    });

    return { success: true, newUpvotes: currentUpvotes, newDownvotes: currentDownvotes, newVote: "NONE" };
  }

  if (currentVote && currentVote !== voteType) {
    // Switch vote
    if (currentVote === "UP") currentUpvotes = Math.max(0, currentUpvotes - 1);
    else currentDownvotes = Math.max(0, currentDownvotes - 1);

    // Update existing vote
    const oldVotes = await dbClient.solutionVote.findMany({
      where: { userId, solutionId },
    }) as DbRecord[];
    for (const v of oldVotes) {
      await dbClient.solutionVote.delete({ where: { id: v.id } });
    }
  }

  // Create new vote
  await dbClient.solutionVote.create({
    data: { userId, solutionId, voteType },
  });

  if (voteType === "UP") currentUpvotes += 1;
  else currentDownvotes += 1;

  await dbClient.communitySolution.update({
    where: { id: solutionId },
    data: { upvotes: currentUpvotes, downvotes: currentDownvotes },
  });

  return { success: true, newUpvotes: currentUpvotes, newDownvotes: currentDownvotes, newVote: voteType };
}

/**
 * Report a solution for inappropriate content.
 */
export async function reportSolution(
  userId: string,
  solutionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  // Check not already reported by this user
  const existing = await dbClient.solutionReport.findFirst({
    where: { userId, solutionId },
    select: { id: true },
  }) as DbRecord | null;

  if (existing) {
    return { success: false, error: "You have already reported this solution." };
  }

  await dbClient.solutionReport.create({
    data: { userId, solutionId, reason },
  });

  return { success: true };
}

/**
 * Delete the user's own solution.
 */
export async function deleteSolution(
  userId: string,
  solutionId: string
): Promise<{ success: boolean; error?: string }> {
  const solution = await dbClient.communitySolution.findFirst({
    where: { id: solutionId, userId },
    select: { id: true },
  }) as DbRecord | null;

  if (!solution) {
    return { success: false, error: "Solution not found or not owned by you." };
  }

  await dbClient.communitySolution.delete({ where: { id: solutionId } });

  // Also clean up votes for this solution
  const votes = await dbClient.solutionVote.findMany({
    where: { solutionId },
  }) as DbRecord[];
  for (const v of votes) {
    await dbClient.solutionVote.delete({ where: { id: v.id } });
  }

  return { success: true };
}
