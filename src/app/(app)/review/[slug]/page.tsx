export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import { db } from "@/lib/db";
import { computeTopicMasteryForUser } from "@/lib/learning/mastery";
import {
  BEGINNER_PROBLEM_COUNT,
  MASTERY_PROBLEM_COUNT,
  getReviewMode,
  type ReviewMode,
} from "@/lib/learning/reviewMode";
import { ReviewSessionClient } from "./ReviewSessionClient";

export default async function ReviewSessionPage({
  params,
}: {
  params: { slug: string };
}) {
  const lookup = findSubtopicBySlug(params.slug);
  if (!lookup) {
    notFound();
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const { data: progressRow } = await supabase
    .from("user_topic_progress")
    .select("session_count, last_mode, first_explored_at")
    .eq("user_id", user.id)
    .eq("topic_slug", lookup.subtopic.slug)
    .maybeSingle();

  const mastery = await computeTopicMasteryForUser(userId, lookup.subtopic.slug);

  const mode: ReviewMode = getReviewMode({
    sessionCount: progressRow?.session_count ?? 0,
    masteryPercentage: mastery.masteryPercentage,
  });
  const limit = mode === "beginner" ? BEGINNER_PROBLEM_COUNT : MASTERY_PROBLEM_COUNT;

  const difficultyFilter =
    mode === "beginner" ? { difficulty: "EASY" as const } : {};

  const candidateProblems = await db.problem.findMany({
    where: {
      topicTag: lookup.subtopic.slug,
      ...difficultyFilter,
    },
  });

  const sorted = [...candidateProblems].sort((a, b) => {
    const order: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
    const diff = (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1);
    if (diff !== 0) return diff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const queue = sorted.slice(0, limit);

  const sessionProblems = queue.map((problem) => ({
    id: problem.id,
    title: problem.title,
    body: problem.body,
    solution: problem.solution,
    difficulty: problem.difficulty,
  }));

  return (
    <ReviewSessionClient
      parentTopicDisplayName={lookup.parentTopic.displayName}
      subtopicDisplayName={lookup.subtopic.displayName}
      subtopicSlug={lookup.subtopic.slug}
      mode={mode}
      sessionCount={progressRow?.session_count ?? 0}
      masteryPercentage={mastery.masteryPercentage}
      problems={sessionProblems}
    />
  );
}
