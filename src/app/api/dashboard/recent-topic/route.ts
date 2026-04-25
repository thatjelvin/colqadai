export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";

export async function GET() {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_topic_progress")
      .select("topic_slug, first_explored_at")
      .eq("user_id", user.id)
      .order("first_explored_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(null);
    }

    const lookup = findSubtopicBySlug(data.topic_slug);

    return NextResponse.json({
      topic_slug: data.topic_slug,
      first_explored_at: data.first_explored_at,
      displayName: lookup?.subtopic.displayName ?? data.topic_slug,
      parentDisplayName: lookup?.parentTopic.displayName ?? null,
    });
  } catch {
    return NextResponse.json(null);
  }
}
