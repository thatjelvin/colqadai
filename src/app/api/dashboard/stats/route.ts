export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { BillingLimitError, buildUpgradeErrorPayload, ensureFeatureAccess } from "@/lib/billing/usage";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { computeOverallMasteryForUser } from "@/lib/learning/mastery";

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

    const userProblems = await db.userProblem.findMany({
      where: { userId },
    });

    const totalSeen = userProblems.length;

    const overallMastery = await computeOverallMasteryForUser(userId);
    const masteryPercentage = overallMastery.masteryPercentage;

    const streak = calculateStreak(userProblems);

    const recentUserProblems = await db.userProblem.findMany({
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
    });

    const recentTopicIds = new Set<string>();
    const recentTopics: Array<{ id: string; name: string; slug: string; description: string | null }> = [];

    for (const up of recentUserProblems) {
      const topicId = up.problem.topic.id;
      if (!recentTopicIds.has(topicId) && recentTopics.length < 3) {
        recentTopicIds.add(topicId);
        recentTopics.push(up.problem.topic);
      }
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [attemptCount, firstTryCorrect, topErrorRows] = await Promise.all([
      db.problemAttempt.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
        },
      }),
      db.problemAttempt.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
          isCorrect: true,
          attemptNumber: 1,
        },
      }),
      db.problemAttempt.groupBy({
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
      }),
    ]);

    const recallScore = attemptCount > 0 ? Math.round((firstTryCorrect / attemptCount) * 100) : 0;
    const topError = topErrorRows.find((row) => row.errorType);

    return NextResponse.json({
      totalSeen,
      masteryPercentage,
      streak,
      recentTopics,
      recallScore,
      topErrorType: topError?.errorType || null,
      topErrorCount: topError?._count._all || 0,
    });
  } catch (error) {
    if (error instanceof BillingLimitError) {
      return NextResponse.json(buildUpgradeErrorPayload(error), { status: error.status });
    }

    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

function calculateStreak(userProblems: { lastReviewedAt: Date | null }[]): number {
  if (userProblems.length === 0) return 0;
  const reviewDates = new Set<string>();

  for (const up of userProblems) {
    if (up.lastReviewedAt) {
      const date = new Date(up.lastReviewedAt);
      const dateStr = date.toISOString().split("T")[0];
      reviewDates.add(dateStr);
    }
  }

  if (reviewDates.size === 0) return 0;

  const sortedDates = Array.from(reviewDates).sort().reverse();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const mostRecentDate = sortedDates[0];
  if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
    return 0;
  }

  let streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i - 1]);
    const prevDate = new Date(sortedDates[i]);

    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
