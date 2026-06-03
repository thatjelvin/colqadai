import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import {
  detectModeTransition,
  getReviewMode,
  type ReviewMode,
} from "@/lib/learning/reviewMode";
import { computeTopicMasteryForUser } from "@/lib/learning/mastery";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { db } from "@/lib/db";

const sessionCompleteSchema = z.object({
  slug: z.string().min(1),
  mode: z.enum(["beginner", "mastery"]),
  problemsAttempted: z.number().int().min(0).max(100),
  averageRating: z.number().min(0).max(5).nullable(),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = sessionCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const { slug, mode, problemsAttempted, averageRating } = parsed.data;

  const lookup = findSubtopicBySlug(slug);
  if (!lookup) {
    return NextResponse.json({ error: "Unknown topic slug" }, { status: 404 });
  }

  const { data: currentProgress } = await supabase
    .from("user_topic_progress")
    .select("session_count, last_mode, review_count")
    .eq("user_id", user.id)
    .eq("topic_slug", slug)
    .maybeSingle();

  const previousSessionCount = currentProgress?.session_count ?? 0;
  const previousMode: ReviewMode | null =
    currentProgress?.last_mode === "beginner" || currentProgress?.last_mode === "mastery"
      ? currentProgress.last_mode
      : null;
  const newSessionCount = previousSessionCount + 1;
  const newReviewCount = (currentProgress?.review_count ?? 0) + 1;
  const now = new Date().toISOString();

  const { error: progressError } = await supabase.from("user_topic_progress").upsert(
    {
      user_id: user.id,
      topic_slug: slug,
      first_explored_at: currentProgress ? undefined : now,
      session_count: newSessionCount,
      review_count: newReviewCount,
      last_mode: mode,
      last_session_at: now,
    },
    { onConflict: "user_id,topic_slug" }
  );

  if (progressError) {
    console.warn("REVIEW SESSION: failed to update progress", progressError);
    return NextResponse.json({ error: "Failed to record session" }, { status: 500 });
  }

  let newMode: ReviewMode = mode;
  try {
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const mastery = await computeTopicMasteryForUser(dbUser.id, slug);
    newMode = getReviewMode({
      sessionCount: newSessionCount,
      masteryPercentage: mastery.masteryPercentage,
    });
  } catch (error) {
    console.warn("REVIEW SESSION: failed to compute new mode", error);
  }

  const transition = detectModeTransition(previousMode, newMode);

  return NextResponse.json({
    success: true,
    sessionCount: newSessionCount,
    previousMode: transition.previousMode,
    newMode: transition.newMode,
    transitioned: transition.transitioned,
    problemsAttempted,
    averageRating,
  });
}
