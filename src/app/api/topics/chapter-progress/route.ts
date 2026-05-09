import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  topicSlug: z.string().min(1),
  chaptersCompleted: z.number().int().min(1),
});

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

    const { topicSlug, chaptersCompleted } = parsed.data;

    const { data: existing, error: existingError } = await supabase
      .from("user_topic_progress")
      .select("chapters_completed")
      .eq("user_id", user.id)
      .eq("topic_slug", topicSlug)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const nextCompleted = Math.max(existing?.chapters_completed ?? 0, chaptersCompleted);

    const { error: upsertError } = await supabase.from("user_topic_progress").upsert(
      {
        user_id: user.id,
        topic_slug: topicSlug,
        chapters_completed: nextCompleted,
      },
      { onConflict: "user_id,topic_slug" }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chaptersCompleted: nextCompleted });
  } catch (error) {
    console.error("Failed to update chapter progress", error);
    return NextResponse.json({ error: "Failed to update chapter progress" }, { status: 500 });
  }
}
