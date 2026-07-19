export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { completeChallenge } from "@/lib/challenge";
import { computeStreak } from "@/lib/learning/streak";
import { db } from "@/lib/db";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};
type PrismaLikeClient = { userProblem: DbModelDelegate };
const dbClient = db as unknown as PrismaLikeClient;

export async function POST() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;

    // Get current streak state from review dates
    const userProblems = await dbClient.userProblem.findMany({
      where: { userId },
      select: { lastReviewedAt: true },
    }) as DbRecord[];

    const reviewDates = userProblems
      .map((up) => up.lastReviewedAt ? new Date(up.lastReviewedAt as string | Date) : null)
      .filter((d): d is Date => d !== null);

    const streakInfo = computeStreak(reviewDates);

    const result = await completeChallenge(userId, {
      current: streakInfo.current,
      longest: streakInfo.longest,
      lastReviewDate: streakInfo.lastReviewDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error completing challenge:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete challenge" },
      { status: 500 }
    );
  }
}
