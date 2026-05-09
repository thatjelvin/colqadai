export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { HIGH_MASTERY_PERCENT } from "@/lib/review-metrics";

export async function GET() {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const nowTs = Date.now();

    const [{ data: progressRows, error: progressError }, { data: streakRow, error: streakError }] =
      await Promise.all([
        supabase
          .from("user_topic_progress")
          .select("review_count, mastery_percent, next_review_due")
          .eq("user_id", user.id),
        supabase
          .from("user_streaks")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    if (progressError) {
      throw new Error(progressError.message);
    }
    if (streakError && streakError.code !== "PGRST116") {
      throw new Error(streakError.message);
    }

    const reviewedRows = (progressRows ?? []).filter((row) => (row.review_count ?? 0) > 0);
    const masterySum = reviewedRows.reduce((acc, row) => acc + (row.mastery_percent ?? 0), 0);
    const masteryPercentage = reviewedRows.length > 0 ? Math.round(masterySum / reviewedRows.length) : 0;
    const masteredCount = reviewedRows.filter((row) => (row.mastery_percent ?? 0) >= HIGH_MASTERY_PERCENT).length;
    const dueTimestamps = reviewedRows.map((row) =>
      row.next_review_due ? new Date(row.next_review_due).getTime() : null
    );
    const dueCount = dueTimestamps.filter((dueTimestamp) => dueTimestamp !== null && dueTimestamp <= nowTs).length;
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
    return NextResponse.json(
      { totalSeen: 0, masteredCount: 0, masteryPercentage: 0, dueCount: 0, streak: 0 },
      { status: 200 }
    );
  }
}
