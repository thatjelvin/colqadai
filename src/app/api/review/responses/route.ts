import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  questionId: z.string().uuid(),
  topicSlug: z.string().min(1),
  rating: z.enum(["got_it", "almost", "didnt_get_it"]),
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

    const { questionId, topicSlug, rating } = parsed.data;

    const { error } = await supabase.from("user_review_responses").insert({
      user_id: user.id,
      question_id: questionId,
      topic_slug: topicSlug,
      rating,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to store review response", error);
    return NextResponse.json({ error: "Failed to store review response" }, { status: 500 });
  }
}
