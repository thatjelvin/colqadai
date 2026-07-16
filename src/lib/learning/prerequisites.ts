/**
 * Checks whether a student has met the prerequisites for a given topic.
 *
 * Uses mastery percentage per prerequisite: if mastery >= 70%, the prereq is met.
 * Returns the list of missing prerequisites so the UI can display a non-blocking banner.
 */

import { db } from "@/lib/db";
import { getPrerequisiteSlugs } from "@/data/prerequisites";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};

type PrismaLikeClient = {
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
 * Compute mastery percentage for a topic.
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

const MASTERY_THRESHOLD = 70;

/**
 * Check prerequisites for a topic and return missing ones.
 *
 * @returns Object with `ready` (all prereqs met), `missing` (slugs below threshold),
 *          and `details` (per-prerequisite mastery info).
 */
export async function checkPrerequisites(
  userId: string,
  problemTopicSlug: string
): Promise<{
  ready: boolean;
  missing: string[];
  details: { slug: string; mastery: number; required: number }[];
}> {
  const prereqSlugs = getPrerequisiteSlugs(problemTopicSlug);

  if (prereqSlugs.length === 0) {
    return { ready: true, missing: [], details: [] };
  }

  const details = await Promise.all(
    prereqSlugs.map(async (slug) => {
      const mastery = await getTopicMastery(userId, slug);
      return { slug, mastery, required: MASTERY_THRESHOLD };
    })
  );

  const missing = details
    .filter((d) => d.mastery < MASTERY_THRESHOLD)
    .map((d) => d.slug);

  return {
    ready: missing.length === 0,
    missing,
    details,
  };
}
