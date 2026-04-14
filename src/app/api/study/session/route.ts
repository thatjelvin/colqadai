import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildInterleavedQueue } from "@/lib/learning/interleaving";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";
import { LearningMethod } from "@prisma/client";

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  if (req.nextUrl.searchParams.get("topic")) {
    return NextResponse.json(
      { error: "Topic-only sessions are disabled to support interleaved practice." },
      { status: 400 }
    );
  }

  const now = new Date();

  const [dueProblems, unseenProblems] = await Promise.all([
    prisma.userProblem.findMany({
      where: {
        userId,
        nextReviewAt: {
          lte: now,
        },
      },
      include: {
        problem: {
          include: { topic: true },
        },
      },
      orderBy: {
        nextReviewAt: "asc",
      },
      take: 30,
    }),
    prisma.problem.findMany({
      where: {
        userProblems: {
          none: {
            userId,
          },
        },
      },
      include: { topic: true },
      take: 20,
    }),
  ]);

  const merged = [
    ...dueProblems.map((up) => ({
      kind: "due" as const,
      problemId: up.problem.id,
      title: up.problem.title,
      topicTag: up.problem.topicTag,
      topicSlug: up.problem.topic.slug,
      topicName: up.problem.topic.name,
      nextReviewAt: up.nextReviewAt,
    })),
    ...unseenProblems.map((problem) => ({
      kind: "new" as const,
      problemId: problem.id,
      title: problem.title,
      topicTag: problem.topicTag,
      topicSlug: problem.topic.slug,
      topicName: problem.topic.name,
      nextReviewAt: null,
    })),
  ];

  const enabled = await isFeatureEnabled(LEARNING_FEATURES.INTERLEAVED_PRACTICE);
  const queue = enabled ? buildInterleavedQueue(merged) : merged;

  const topics = Array.from(new Set(queue.map((item) => item.topicTag || item.topicSlug)));

  await upsertLearningAnalytics(
    userId,
    `${new Date().toISOString().slice(0, 10)}:interleaved-session`,
    LearningMethod.INTERLEAVED_PRACTICE,
    {
      queueSize: queue.length,
      topicCount: topics.length,
      mixed: topics.length > 1,
    }
  );

  return NextResponse.json({
    queue,
    summary: {
      topicCount: topics.length,
      text:
        topics.length > 1
          ? `You practiced ${topics.length} different topics - great for long-term retention.`
          : "Mixing topics improves long-term retention.",
    },
  });
}
