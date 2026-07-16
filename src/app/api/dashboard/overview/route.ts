export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { computeOverallMasteryForUser } from "@/lib/learning/mastery";
import { computeStreak, uniqueDayKeys } from "@/lib/learning/streak";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { getForecastLabel } from "@/lib/learning/priorityScoring";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

type UserProblemRecord = {
  status: string | null;
  lastReviewedAt: Date | string | null;
  nextReviewAt: Date | string;
};

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  count(args?: Record<string, unknown>): Promise<number>;
};
type PrismaLikeClient = {
  userProblem: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

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

    const userProblems = await dbClient.userProblem.findMany({
      where: { userId },
      select: { status: true, lastReviewedAt: true, nextReviewAt: true },
    }) as unknown as UserProblemRecord[];

    const totalSeen = userProblems.length;

    const dueCount = await dbClient.userProblem.count({
      where: { userId, nextReviewAt: { lte: new Date() } },
    });

    const streakInfo = computeStreak(
      userProblems.map((up) => (up.lastReviewedAt ? new Date(up.lastReviewedAt) : undefined))
    );
    const overallMastery = await computeOverallMasteryForUser(userId);
    const masteryPercentage = overallMastery.masteryPercentage;

    // Build heatmap data: date keys for the last 16 weeks of review activity
    const fullUserProblems = await dbClient.userProblem.findMany({
      where: { userId },
      select: { lastReviewedAt: true, nextReviewAt: true },
    }) as unknown as UserProblemRecord[];

    const reviewDayKeys = uniqueDayKeys(
      fullUserProblems.map((up) => up.lastReviewedAt ? new Date(up.lastReviewedAt) : undefined)
    );

    // Forecast: compute next-review labels for the 10 most recent problems
    const recentWithForecast = fullUserProblems
      .filter((up) => up.nextReviewAt)
      .sort((a, b) => new Date(b.lastReviewedAt ?? 0).getTime() - new Date(a.lastReviewedAt ?? 0).getTime())
      .slice(0, 10)
      .map((up) => ({
        nextReviewAt: up.nextReviewAt,
        forecastLabel: getForecastLabel(
          up.nextReviewAt instanceof Date ? up.nextReviewAt : new Date(up.nextReviewAt)
        ),
      }));

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
      reviewDayKeys,
      forecast: recentWithForecast,
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
        reviewDayKeys: [],
        forecast: [],
      },
      { status: 200 }
    );
  }
}
