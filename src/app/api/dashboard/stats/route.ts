export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { BillingLimitError, buildUpgradeErrorPayload, ensureFeatureAccess } from "@/lib/billing/usage";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { computeOverallMasteryForUser } from "@/lib/learning/mastery";
import { computeStreak } from "@/lib/learning/streak";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

type UserProblemRecord = {
  lastReviewedAt: Date | string | null;
  nextReviewAt: Date | string;
  problem: {
    topic: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
    };
  } | null;
};

type ProblemAttemptGroupByRecord = {
  errorType: string | null;
  _count: {
    _all: number;
  };
};

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  count(args?: Record<string, unknown>): Promise<number>;
  groupBy(args?: Record<string, unknown>): Promise<DbRecord[]>;
};

type PrismaLikeClient = {
  userProblem: DbModelDelegate;
  problemAttempt: DbModelDelegate;
};

const dbClient = db as unknown as PrismaLikeClient;

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;

    await ensureFeatureAccess(userId, "analytics");

    const userProblems = await dbClient.userProblem.findMany({
      where: { userId },
      select: { lastReviewedAt: true, nextReviewAt: true },
    }) as unknown as { lastReviewedAt: Date | string | null; nextReviewAt: Date | string }[];

    const totalSeen = userProblems.length;

    const dueCount = await dbClient.userProblem.count({
      where: { userId, nextReviewAt: { lte: new Date() } },
    });

    const streakInfo = computeStreak(
      userProblems.map((up) => (up.lastReviewedAt ? new Date(up.lastReviewedAt) : undefined))
    );
    const overallMastery = await computeOverallMasteryForUser(userId);
    const masteryPercentage = overallMastery.masteryPercentage;

    const recentUserProblems = await dbClient.userProblem.findMany({
      where: { userId },
      orderBy: { lastReviewedAt: "desc" },
      take: 10,
      include: {
        problem: {
          include: {
            topic: true,
          },
        },
      },
    }) as unknown as UserProblemRecord[];

    const recentTopicIds = new Set<string>();
    const recentTopics: Array<{ id: string; name: string; slug: string; description: string | null }> = [];

    for (const up of recentUserProblems) {
      const topic = up.problem?.topic;
      if (topic && !recentTopicIds.has(topic.id) && recentTopics.length < 3) {
        recentTopicIds.add(topic.id);
        recentTopics.push(topic);
      }
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [attemptCount, firstTryCorrect, topErrorRows] = await Promise.all([
      dbClient.problemAttempt.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
        },
      }),
      dbClient.problemAttempt.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
          isCorrect: true,
          attemptNumber: 1,
        },
      }),
      dbClient.problemAttempt.groupBy({
        by: ["errorType"],
        where: {
          userId,
          isCorrect: false,
          createdAt: { gte: oneWeekAgo },
        },
        _count: { _all: true },
        orderBy: {
          _count: {
            errorType: "desc",
          },
        },
      }) as unknown as ProblemAttemptGroupByRecord[],
    ]);

    const recallScore = attemptCount > 0 ? Math.round((firstTryCorrect / attemptCount) * 100) : 0;
    const topError = topErrorRows.find((row) => row.errorType);

    return NextResponse.json({
      totalSeen,
      masteryPercentage,
      dueCount,
      streak: streakInfo.current,
      longestStreak: streakInfo.longest,
      reviewedToday: streakInfo.reviewedToday,
      lastReviewDate: streakInfo.lastReviewDate,
      attemptedCount: overallMastery.attemptedCount,
      totalProblems: overallMastery.totalProblems,
      recentTopics,
      recallScore,
      topErrorType: topError?.errorType || null,
      topErrorCount: topError?._count?._all || 0,
    });
  } catch (error) {
    if (error instanceof BillingLimitError) {
      return NextResponse.json(buildUpgradeErrorPayload(error), { status: error.status });
    }

    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      {
        totalSeen: 0,
        masteryPercentage: 0,
        dueCount: 0,
        streak: 0,
        longestStreak: 0,
        reviewedToday: false,
        lastReviewDate: null,
        attemptedCount: 0,
        totalProblems: 0,
        recentTopics: [],
        recallScore: 0,
        topErrorType: null,
        topErrorCount: 0,
      },
      { status: 200 }
    );
  }
}