import "server-only";
import { db } from "@/lib/db";
import type { TopicMastery, OverallMastery } from "./mastery-types";
import {
  RATING_PROBLEM_SCORE,
  FIRST_TRY_PROBLEM_SCORE,
  MIN_RATINGS_FOR_BAND,
  bandForScore,
  trendFor,
  roundPct,
  extractRatingsFromAnalytics,
  parseRating,
  computeProblemRatingScore,
  normalizeTopicSlug,
  type RatingEntry,
} from "./mastery-pure";

export type { TopicMastery, OverallMastery };

const dbAny = db as unknown as Record<string, any>;

type UserProblemWithProblem = {
  problemId: string;
  status?: string | null;
  problem: {
    topicTag?: string | null;
    topic: {
      slug: string;
    };
  } | null;
};

type ProblemAttemptRow = {
  userId: string;
  problemId: string;
  isCorrect: boolean;
  attemptNumber: number;
  createdAt: Date | string;
};

type LearningAnalyticsRow = {
  userId: string;
  sessionKey: string;
  method: string;
  aggregate: unknown;
};

function toMs(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return value;
}

export async function computeTopicMasteryForUser(
  userId: string,
  topicSlug: string,
): Promise<TopicMastery> {
  const allUserProblems = await dbAny.userProblem.findMany({
    where: { userId },
    include: {
      problem: { include: { topic: true } },
    },
  });

  const userProblems: UserProblemWithProblem[] = allUserProblems.filter(
    (up: any): up is UserProblemWithProblem => Boolean(up.problem),
  );

  const topicUserProblems = userProblems.filter(
    (up) => normalizeTopicSlug(up.problem?.topicTag) === topicSlug
      || normalizeTopicSlug(up.problem?.topic?.slug) === topicSlug,
  );

  const totalProblems = await dbAny.problem.count({
    where: {
      OR: [
        { topicTag: topicSlug },
        { topic: { slug: topicSlug } },
      ],
    },
  });

  if (topicUserProblems.length === 0) {
    return {
      topicSlug,
      totalProblems,
      attemptedProblems: 0,
      masteryScore: 0,
      masteryPercentage: 0,
      averageRating: null,
      averageFirstTryRate: 0,
      recentRatingTrend: "unknown",
      band: "none",
    };
  }

  const userProblemIds = topicUserProblems.map((up) => up.problemId);
  const attempts = await dbAny.problemAttempt.findMany({
    where: {
      userId,
      problemId: { in: userProblemIds },
    },
  }) as ProblemAttemptRow[];

  const analytics = await dbAny.learningAnalytics.findMany({
    where: {
      userId,
      method: "SPACED_REPETITION",
    },
  }) as LearningAnalyticsRow[];

  const ratingsByProblem = new Map<string, RatingEntry[]>();
  for (const row of analytics) {
    const ratings = extractRatingsFromAnalytics(row.aggregate);
    for (const r of ratings) {
      if (!userProblemIds.includes(r.problemId)) continue;
      const list = ratingsByProblem.get(r.problemId) ?? [];
      list.push(r);
      ratingsByProblem.set(r.problemId, list);
    }
  }

  let combinedScore = 0;
  let combinedWeight = 0;
  let totalRating = 0;
  let totalRatingWeight = 0;
  let firstTryCorrect = 0;
  let firstTryAttempts = 0;
  const allRatings: number[] = [];

  for (const up of topicUserProblems) {
    const problemId = up.problemId;
    const problemAttempts = attempts
      .filter((a) => a.problemId === problemId)
      .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));

    const firstTry = problemAttempts.find((a) => a.attemptNumber === 1);
    if (firstTry) {
      firstTryAttempts += 1;
      if (firstTry.isCorrect) firstTryCorrect += 1;
    }

    const ratings = (ratingsByProblem.get(problemId) ?? []).sort(
      (a, b) => a.createdAt - b.createdAt,
    );

    const ratingScore = computeProblemRatingScore(ratings);

    const attemptScore = problemAttempts.length > 0
      ? (problemAttempts[problemAttempts.length - 1]?.isCorrect ? 1 : 0)
      : 0;

    let problemScore: number;
    if (ratings.length > 0 && problemAttempts.length > 0) {
      problemScore = ratingScore * RATING_PROBLEM_SCORE
        + attemptScore * FIRST_TRY_PROBLEM_SCORE;
    } else if (ratings.length > 0) {
      problemScore = ratingScore * 0.85 + 0.15;
    } else if (problemAttempts.length > 0) {
      problemScore = attemptScore * 0.5 + 0.2;
    } else {
      problemScore = 0.1;
    }

    const weight = Math.min(1, 0.4 + ratings.length * 0.2 + problemAttempts.length * 0.1);
    combinedScore += problemScore * weight;
    combinedWeight += weight;

    for (const r of ratings) {
      allRatings.push(r.rating);
      totalRating += r.rating;
      totalRatingWeight += 1;
    }
  }

  const averageRating = totalRatingWeight > 0 ? totalRating / totalRatingWeight : null;
  const averageFirstTryRate = firstTryAttempts > 0 ? firstTryCorrect / firstTryAttempts : 0;
  const rawScore = combinedWeight > 0 ? combinedScore / combinedWeight : 0;
  const attemptedProblems = topicUserProblems.length;
  const coverageFactor = totalProblems > 0
    ? Math.min(1, attemptedProblems / Math.max(1, Math.min(totalProblems, 4)))
    : 1;
  const masteryScore = rawScore * (0.4 + 0.6 * coverageFactor);
  const masteryPercentage = roundPct(masteryScore);

  return {
    topicSlug,
    totalProblems,
    attemptedProblems,
    masteryScore,
    masteryPercentage,
    averageRating: averageRating !== null ? Number(averageRating.toFixed(2)) : null,
    averageFirstTryRate: Number(averageFirstTryRate.toFixed(2)),
    recentRatingTrend: trendFor(allRatings),
    band: bandForScore(masteryScore, totalRatingWeight >= MIN_RATINGS_FOR_BAND || attemptedProblems > 0),
  };
}

export async function computeOverallMasteryForUser(
  userId: string,
): Promise<OverallMastery> {
  const userProblems = await dbAny.userProblem.findMany({
    where: { userId },
    include: { problem: { include: { topic: true } } },
  });

  const allTopics = new Set<string>();
  for (const up of userProblems) {
    const slug = normalizeTopicSlug(up.problem?.topicTag) !== "general"
      ? normalizeTopicSlug(up.problem?.topicTag)
      : normalizeTopicSlug(up.problem?.topic?.slug);
    if (slug) allTopics.add(slug);
  }

  if (allTopics.size === 0) {
    return { masteryPercentage: 0, attemptedCount: 0, totalProblems: 0 };
  }

  let totalScore = 0;
  let totalAttempted = 0;
  let totalProblems = 0;
  for (const topic of allTopics) {
    const mastery = await computeTopicMasteryForUser(userId, topic);
    totalScore += mastery.masteryPercentage;
    totalAttempted += mastery.attemptedProblems;
    totalProblems += mastery.totalProblems;
  }

  return {
    masteryPercentage: Math.round(totalScore / allTopics.size),
    attemptedCount: totalAttempted,
    totalProblems,
  };
}

export async function computeMasteryForAllTopics(
  userId: string,
): Promise<Record<string, TopicMastery>> {
  const userProblems = await dbAny.userProblem.findMany({
    where: { userId },
    include: { problem: { include: { topic: true } } },
  });

  const topics = new Set<string>();
  for (const up of userProblems) {
    const fromTag = normalizeTopicSlug(up.problem?.topicTag);
    const fromSlug = normalizeTopicSlug(up.problem?.topic?.slug);
    if (fromTag && fromTag !== "general") topics.add(fromTag);
    if (fromSlug) topics.add(fromSlug);
  }

  const result: Record<string, TopicMastery> = {};
  for (const topic of topics) {
    result[topic] = await computeTopicMasteryForUser(userId, topic);
  }
  return result;
}
