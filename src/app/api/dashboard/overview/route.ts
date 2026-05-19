export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { HIGH_MASTERY_PERCENT } from "@/lib/review-metrics";

type ProgressRow = {
  review_count: number | null;
  mastery_percent?: number | null;
  mastery_score?: number | null;
  next_review_due?: string | null;
  next_review_date?: string | null;
};

async function fetchProgressRows(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const primary = await supabase
    .from("user_topic_progress")
    .select("review_count, mastery_percent, next_review_due")
    .eq("user_id", userId);

  if (!primary.error) {
    return {
      rows: (primary.data ?? []) as ProgressRow[],
      masteryKey: "mastery_percent" as const,
      dueKey: "next_review_due" as const,
    };
  }

  if (primary.error.code !== "42703") {
    throw new Error(primary.error.message);
  }

  const fallback = await supabase
    .from("user_topic_progress")
    .select("review_count, mastery_score, next_review_date")
    .eq("user_id", userId);

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return {
    rows: (fallback.data ?? []) as ProgressRow[],
    masteryKey: "mastery_score" as const,
    dueKey: "next_review_date" as const,
  };
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const endOfTodayUtc = new Date();
    endOfTodayUtc.setUTCHours(23, 59, 59, 999);

    const [progressResult, { data: streakRow, error: streakError }] =
      await Promise.all([
        fetchProgressRows(supabase, user.id),
        supabase
          .from("user_streaks")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    if (streakError && streakError.code !== "PGRST116") {
      throw new Error(streakError.message);
    }

    const progressRows = progressResult.rows;
    const masteryKey = progressResult.masteryKey;
    const dueKey = progressResult.dueKey;
    const reviewedRows = (progressRows ?? []).filter((row) => (row.review_count ?? 0) > 0);
    const masterySum = reviewedRows.reduce((acc, row) => {
      const masteryValue = masteryKey === "mastery_percent" ? row.mastery_percent : row.mastery_score;
      return acc + (masteryValue ?? 0);
    }, 0);
    const masteryPercentage = reviewedRows.length > 0 ? Math.round(masterySum / reviewedRows.length) : 0;
    const masteredCount = reviewedRows.filter((row) => {
      const masteryValue = masteryKey === "mastery_percent" ? row.mastery_percent : row.mastery_score;
      return (masteryValue ?? 0) >= HIGH_MASTERY_PERCENT;
    }).length;
    const dueCount = reviewedRows.filter((row) => {
      const dueDate = dueKey === "next_review_due" ? row.next_review_due : row.next_review_date;
      return dueDate ? new Date(dueDate).getTime() <= endOfTodayUtc.getTime() : false;
    }).length;
    const streak = streakRow?.current_streak ?? 0;

    return NextResponse.json({
      totalSeen: reviewedRows.length,
      masteredCount,
      masteryPercentage,
      dueCount,
      streak,
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard overview" }, { status: 500 });
  }
}
