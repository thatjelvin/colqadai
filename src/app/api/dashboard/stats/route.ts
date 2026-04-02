// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillingLimitError, buildUpgradeErrorPayload, ensureFeatureAccess } from "@/lib/billing/usage";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

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

    const recentTopicIds = new Set();
    const recentTopics = [];

    for (const up of recentUserProblems) {
      const topicId = up.problem.topic.id;
      if (!recentTopicIds.has(topicId) && recentTopics.length < 3) {
        recentTopicIds.add(topicId);
        recentTopics.push(up.problem.topic);
      }
    }

    return NextResponse.json({
      totalSeen,
      masteryPercentage,
      streak,
      recentTopics,
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
