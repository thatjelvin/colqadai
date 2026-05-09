import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  topicSlug: z.string().min(1),
  ratings: z.object({
    got_it: z.number().int().min(0),
    almost: z.number().int().min(0),
    didnt_get_it: z.number().int().min(0),
  }),
});

function getSessionMasteryPercent(ratings: { got_it: number; almost: number; didnt_get_it: number }) {
  const totalQuestions = ratings.got_it + ratings.almost + ratings.didnt_get_it;
  if (totalQuestions === 0) {
    return 0;
  }

  const earnedPoints = ratings.got_it * 100 + ratings.almost * 50;
  const mastery = (earnedPoints / (totalQuestions * 100)) * 100;
  return Math.round(mastery);
}

function getNextReviewIntervalDays(sessionMasteryPercent: number, reviewCount: number) {
  if (sessionMasteryPercent >= 80 && reviewCount >= 3) {
    return 21;
  }
  if (sessionMasteryPercent >= 80 && reviewCount < 3) {
    return 7;
  }
  if (sessionMasteryPercent >= 50) {
    return 3;
  }
  return 1;
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
    const sessionMasteryPercent = getSessionMasteryPercent(ratings);

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
    const nextReviewDue = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

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
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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
