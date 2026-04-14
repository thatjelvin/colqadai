import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { BillingLimitError, buildUpgradeErrorPayload, ensureFeatureAccess } from "@/lib/billing/usage";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

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

    // Get all user problems
    const userProblems = await prisma.userProblem.findMany({
      where: { userId },
    });

    // Total problems seen
    const totalSeen = userProblems.length;

    // Mastery percentage
    const masteredCount = userProblems.filter(
      (up) => up.status === "MASTERED"
    ).length;
    const masteryPercentage =
      totalSeen > 0 ? Math.round((masteredCount / totalSeen) * 100) : 0;

    // Calculate streak
    const streak = calculateStreak(userProblems);

    // Get recent topics (last 3 topics user interacted with)
    const recentUserProblems = await prisma.userProblem.findMany({
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
      prisma.problemAttempt.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
        },
      }),
      prisma.problemAttempt.count({
        where: {
          userId,
          createdAt: { gte: oneWeekAgo },
          isCorrect: true,
          attemptNumber: 1,
        },
      }),
      prisma.problemAttempt.groupBy({
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

  // Get all unique review dates
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

  // Check if streak is still active (reviewed today or yesterday)
  const mostRecentDate = sortedDates[0];
  if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
    return 0;
  }

  // Count consecutive days
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
