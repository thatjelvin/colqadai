import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { HIGH_MASTERY_PERCENT, MEDIUM_MASTERY_PERCENT, calculateMasteryPercent } from "@/lib/review-metrics";

const LONG_INTERVAL_DAYS = 21;
const MID_INTERVAL_DAYS = 7;
const SHORT_INTERVAL_DAYS = 3;
const NEXT_DAY_INTERVAL_DAYS = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const requestSchema = z.object({
  topicSlug: z.string().min(1),
  ratings: z.object({
    got_it: z.number().int().min(0),
    almost: z.number().int().min(0),
    didnt_get_it: z.number().int().min(0),
  }),
});

function getNextReviewIntervalDays(sessionMasteryPercent: number, reviewCount: number) {
  if (sessionMasteryPercent >= HIGH_MASTERY_PERCENT && reviewCount >= 3) {
    return LONG_INTERVAL_DAYS;
  }
  if (sessionMasteryPercent >= HIGH_MASTERY_PERCENT && reviewCount < 3) {
    return MID_INTERVAL_DAYS;
  }
  if (sessionMasteryPercent >= MEDIUM_MASTERY_PERCENT) {
    return SHORT_INTERVAL_DAYS;
  }
  return NEXT_DAY_INTERVAL_DAYS;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { topicSlug, ratings } = parsed.data;
    const totalQuestions = ratings.got_it + ratings.almost + ratings.didnt_get_it;
    const sessionMasteryPercent = calculateMasteryPercent(ratings.got_it, ratings.almost, totalQuestions);

    const { data: progress, error: progressFetchError } = await supabase
      .from("user_topic_progress")
      .select("review_count")
      .eq("user_id", user.id)
      .eq("topic_slug", topicSlug)
      .maybeSingle();

    if (progressFetchError) {
      if (progressFetchError.code === "42P01") {
        return NextResponse.json(
          { error: "Review tables are missing. Run the required Supabase migrations first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: progressFetchError.message }, { status: 500 });
    }

    const now = new Date();
    const nextReviewCount = (progress?.review_count ?? 0) + 1;
    const intervalDays = getNextReviewIntervalDays(sessionMasteryPercent, nextReviewCount);
    const nextReviewDue = new Date(now.getTime() + intervalDays * MS_PER_DAY);

    const { error: progressUpsertError } = await supabase.from("user_topic_progress").upsert(
      {
        user_id: user.id,
        topic_slug: topicSlug,
        review_count: nextReviewCount,
        mastery_percent: sessionMasteryPercent,
        last_reviewed_at: now.toISOString(),
        next_review_due: nextReviewDue.toISOString(),
      },
      {
        onConflict: "user_id,topic_slug",
      }
    );

    if (progressUpsertError) {
      if (progressUpsertError.code === "42P01") {
        return NextResponse.json(
          { error: "Review tables are missing. Run the required Supabase migrations first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: progressUpsertError.message }, { status: 500 });
    }

    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - MS_PER_DAY).toISOString().split("T")[0];

    const { data: streakRow, error: streakFetchError } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streakFetchError && streakFetchError.code !== "PGRST116") {
      if (streakFetchError.code === "42P01") {
        return NextResponse.json(
          { error: "Review tables are missing. Run the required Supabase migrations first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: streakFetchError.message }, { status: 500 });
    }

    const previousDate = streakRow?.last_activity_date ?? null;
    let nextCurrentStreak = 1;

    if (previousDate === today) {
      nextCurrentStreak = streakRow?.current_streak ?? 1;
    } else if (previousDate === yesterday) {
      nextCurrentStreak = (streakRow?.current_streak ?? 0) + 1;
    }

    const nextLongestStreak = Math.max(streakRow?.longest_streak ?? 0, nextCurrentStreak);

    const { error: streakUpsertError } = await supabase.from("user_streaks").upsert(
      {
        user_id: user.id,
        current_streak: nextCurrentStreak,
        longest_streak: nextLongestStreak,
        last_activity_date: today,
      },
      { onConflict: "user_id" }
    );

    if (streakUpsertError) {
      if (streakUpsertError.code === "42P01") {
        return NextResponse.json(
          { error: "Review tables are missing. Run the required Supabase migrations first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: streakUpsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      reviewCount: nextReviewCount,
      masteryPercent: sessionMasteryPercent,
      nextReviewDue: nextReviewDue.toISOString(),
      streak: nextCurrentStreak,
    });
  } catch (error) {
    console.error("Failed to complete review session", error);
    return NextResponse.json({ error: "Failed to complete review session" }, { status: 500 });
  }
}
