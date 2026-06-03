export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { computeOverallMasteryForUser } from "@/lib/learning/mastery";
import { computeStreak } from "@/lib/learning/streak";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

export async function GET() {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;

    const userProblems = await db.userProblem.findMany({
      where: { userId },
      select: { status: true, lastReviewedAt: true, nextReviewAt: true },
    });

    const totalSeen = userProblems.length;

    const dueCount = await db.userProblem.count({
      where: { userId, nextReviewAt: { lte: new Date() } },
    });

    const streakInfo = computeStreak(userProblems.map((up) => up.lastReviewedAt));
    const overallMastery = await computeOverallMasteryForUser(userId);
    const masteryPercentage = overallMastery.masteryPercentage;

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
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
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
      },
      { status: 200 }
    );
  }
}
