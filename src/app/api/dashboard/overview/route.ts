export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

const MS_PER_DAY = 86400000;

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
      select: { status: true, lastReviewedAt: true },
    });

    const totalSeen = userProblems.length;
    const masteredCount = userProblems.filter((up) => up.status === "MASTERED").length;
    const masteryPercentage =
      totalSeen > 0 ? Math.round((masteredCount / totalSeen) * 100) : 0;

    const dueCount = await db.userProblem.count({
      where: { userId, nextReviewAt: { lte: new Date() } },
    });

    const streak = calculateStreak(userProblems);

    return NextResponse.json({
      totalSeen,
      masteredCount,
      masteryPercentage,
      dueCount,
      streak,
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    return NextResponse.json(
      { totalSeen: 0, masteredCount: 0, masteryPercentage: 0, dueCount: 0, streak: 0 },
      { status: 200 }
    );
  }
}

function calculateStreak(userProblems: { lastReviewedAt: Date | null }[]): number {
  if (userProblems.length === 0) return 0;

  const reviewDates = new Set<string>();
  for (const up of userProblems) {
    if (up.lastReviewedAt) {
      reviewDates.add(new Date(up.lastReviewedAt).toISOString().split("T")[0]);
    }
  }
  if (reviewDates.size === 0) return 0;

  const sortedDates = Array.from(reviewDates).sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split("T")[0];

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const curr = new Date(sortedDates[i - 1]).getTime();
    const prev = new Date(sortedDates[i]).getTime();
    if (Math.round((curr - prev) / 86400000) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
