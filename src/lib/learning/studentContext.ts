import { db } from "@/lib/db";

/**
 * Builds a plain-text student context block for injection into the AI tutor system prompt.
 *
 * Includes:
 * - Last 10 problem attempts (right/wrong + topic)
 * - Mastery levels per topic
 * - Common recent error types
 *
 * This data helps the AI avoid repeating what the student already knows
 * and focus on weak areas. Based on Khan Academy's 2026 finding that
 * providing student history context improved next-item correctness by +3.4%.
 */

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
};

type PrismaLikeClient = {
  problemAttempt: DbModelDelegate;
  userProblem: DbModelDelegate;
};

const dbClient = db as unknown as PrismaLikeClient;

/**
 * Normalize a topic slug for comparison (strip prefixes, lowercase).
 */
function normalizeSlug(slug: string | null | undefined): string {
  if (!slug) return "unknown";
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/**
 * Fetch mastery percentage for a topic (simplified inline computation).
 */
async function getTopicMastery(userId: string, topicSlug: string): Promise<number> {
  const userProblems = await dbClient.userProblem.findMany({
    where: { userId },
  });

  const topicProblems = userProblems.filter((up) => {
    const slug = normalizeSlug(up.topicTag as string | null);
    return slug === normalizeSlug(topicSlug);
  });

  if (topicProblems.length === 0) return 0;

  const mastered = topicProblems.filter(
    (up) => (up.repetitions as number) >= 3 || (up.status as string) === "MASTERED"
  ).length;

  return Math.round((mastered / topicProblems.length) * 100);
}

/**
 * Build a plain-text context string about the student's recent performance.
 */
export async function buildStudentContext(userId: string): Promise<string> {
  try {
    // Fetch last 10 attempts
    const recentAttempts = await dbClient.problemAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Fetch all user problems for mastery calculation
    const allUserProblems = await dbClient.userProblem.findMany({
      where: { userId },
    });

    // Build recent performance summary
    const attemptLines = recentAttempts.map((attempt) => {
      const isCorrect = attempt.isCorrect ? "✓ correct" : "✗ wrong";
      const problemId = (attempt.problemId as string)?.slice(0, 8) ?? "?";
      const errorType = attempt.errorType ? ` (${attempt.errorType})` : "";
      return `  - Problem ${problemId}...: ${isCorrect}${errorType}`;
    });

    // Compute topic mastery
    const topicMap = new Map<string, { total: number; mastered: number }>();
    for (const up of allUserProblems) {
      const slug = normalizeSlug(up.topicTag as string | null);
      if (slug === "unknown") continue;
      const existing = topicMap.get(slug) ?? { total: 0, mastered: 0 };
      existing.total += 1;
      if ((up.repetitions as number) >= 3 || (up.status as string) === "MASTERED") {
        existing.mastered += 1;
      }
      topicMap.set(slug, existing);
    }

    const masteryLines = Array.from(topicMap.entries())
      .map(([slug, { total, mastered }]) => {
        const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
        return `  - ${slug}: ${pct}% mastery (${mastered}/${total} problems)`;
      })
      .slice(0, 10);

    // Count recent error types
    const errorCounts = new Map<string, number>();
    for (const attempt of recentAttempts) {
      if (!attempt.isCorrect && attempt.errorType) {
        const count = errorCounts.get(attempt.errorType as string) ?? 0;
        errorCounts.set(attempt.errorType as string, count + 1);
      }
    }

    const errorLines = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `  - ${type}: ${count}x recent`);

    // Assemble context
    const parts: string[] = [];

    parts.push("Student's recent performance:");
    if (attemptLines.length > 0) {
      parts.push(attemptLines.join("\n"));
    } else {
      parts.push("  (No recent attempts)");
    }

    if (masteryLines.length > 0) {
      parts.push("\nTopic mastery levels:");
      parts.push(masteryLines.join("\n"));
    }

    if (errorLines.length > 0) {
      parts.push("\nRecent error patterns:");
      parts.push(errorLines.join("\n"));
    }

    parts.push(
      "\nTeach based on this context. Don't repeat what they already know well. Focus on weak areas and common error patterns."
    );

    return parts.join("\n");
  } catch (error) {
    console.warn("Failed to build student context:", error);
    return "(Student context unavailable — teach generally)";
  }
}
