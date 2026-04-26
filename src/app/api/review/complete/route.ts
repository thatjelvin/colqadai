import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const HIGH_CONFIDENCE_INTERVALS = [1, 3, 7, 21] as const;
const MEDIUM_CONFIDENCE_INTERVALS = [1, 2, 5, 14] as const;
const LOW_CONFIDENCE_INTERVALS = [1, 2, 4, 7] as const;

const requestSchema = z.object({
  topicSlug: z.string().min(1),
  ratings: z.object({
    got_it: z.number().int().min(0),
    almost: z.number().int().min(0),
    didnt_get_it: z.number().int().min(0),
  }),
});

function getReminderIntervals(ratings: { got_it: number; almost: number; didnt_get_it: number }) {
  const max = Math.max(ratings.got_it, ratings.almost, ratings.didnt_get_it);
  const topRatings = [
    ratings.got_it === max ? "got_it" : null,
    ratings.almost === max ? "almost" : null,
    ratings.didnt_get_it === max ? "didnt_get_it" : null,
  ].filter((value): value is "got_it" | "almost" | "didnt_get_it" => Boolean(value));

  // Tie-break conservatively: if struggling is tied for highest, prioritize shorter intervals.
  if (topRatings.includes("didnt_get_it")) {
    return LOW_CONFIDENCE_INTERVALS;
  }

  // If "got_it" and "almost" tie, choose medium spacing over optimistic spacing.
  if (topRatings.length > 1 && topRatings.includes("almost")) {
    return MEDIUM_CONFIDENCE_INTERVALS;
  }

  if (topRatings[0] === "got_it") {
    return HIGH_CONFIDENCE_INTERVALS;
  }

  if (topRatings[0] === "almost") {
    return MEDIUM_CONFIDENCE_INTERVALS;
  }

  return LOW_CONFIDENCE_INTERVALS;
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
    const intervals = getReminderIntervals(ratings);

    const { error: deleteError } = await supabase
      .from("review_reminders")
      .delete()
      .eq("user_id", user.id)
      .eq("topic_slug", topicSlug)
      .eq("sent", false);

    if (deleteError) {
      if (deleteError.code === "42P01") {
        return NextResponse.json(
          { error: "Review tables are missing. Run the required Supabase migrations first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const now = new Date();
    const remindersToInsert = intervals.map((days) => ({
      user_id: user.id,
      topic_slug: topicSlug,
      scheduled_for: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
      sent: false,
    }));

    const { error } = await supabase.from("review_reminders").insert(remindersToInsert);

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Review tables are missing. Run the required Supabase migrations first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, intervals });
  } catch (error) {
    console.error("Failed to complete review session", error);
    return NextResponse.json({ error: "Failed to complete review session" }, { status: 500 });
  }
}
