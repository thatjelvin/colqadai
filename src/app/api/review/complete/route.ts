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

function getReminderIntervals(ratings: { got_it: number; almost: number; didnt_get_it: number }) {
  if (ratings.got_it >= ratings.almost && ratings.got_it >= ratings.didnt_get_it) {
    return [1, 3, 7, 21];
  }

  if (ratings.almost >= ratings.got_it && ratings.almost >= ratings.didnt_get_it) {
    return [1, 2, 5, 14];
  }

  return [1, 2, 4, 7];
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

    await supabase
      .from("review_reminders")
      .delete()
      .eq("user_id", user.id)
      .eq("topic_slug", topicSlug)
      .eq("sent", false);

    const now = new Date();
    const remindersToInsert = intervals.map((days) => ({
      user_id: user.id,
      topic_slug: topicSlug,
      scheduled_for: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
      sent: false,
    }));

    const { error } = await supabase.from("review_reminders").insert(remindersToInsert);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, intervals });
  } catch (error) {
    console.error("Failed to complete review session", error);
    return NextResponse.json({ error: "Failed to complete review session" }, { status: 500 });
  }
}
