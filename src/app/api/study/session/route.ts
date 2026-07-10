import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { buildInterleavedQueue } from "@/lib/learning/interleaving";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";
import { LearningMethod } from "@/lib/db-types";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

type UserProblemRecord = {
  id: string;
  nextReviewAt: Date | string;
  problem: {
    id: string;
    title: string;
    topicTag: string | null;
    topic: {
      slug: string;
      name: string;
    } | null;
  } | null;
};

type ProblemRecord = {
  id: string;
  title: string;
  topicTag: string | null;
  topic: {
    slug: string;
    name: string;
  } | null;
};

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};

type PrismaLikeClient = {
  userProblem: DbModelDelegate;
  problem: DbModelDelegate;
};

const dbClient = db as unknown as PrismaLikeClient;

type InterleavedInputItem = {
  kind: "due" | "new";
  problemId: string;
  title: string;
  topicTag: string | null;
  topicSlug: string | null;
  topicName: string;
  nextReviewAt: Date | null;
};

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
    dbClient.userProblem.findMany({
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
    }) as Promise<UserProblemRecord[]>,
    dbClient.problem.findMany({
      where: {
        userProblems: {
          none: {
            userId,
          },
        },
      },
      include: { topic: true },
      take: 20,
    }) as Promise<ProblemRecord[]>,
  ]);

  const merged: InterleavedInputItem[] = [
    ...dueProblems.map((up) => ({
      kind: "due" as const,
      problemId: up.problem?.id ?? "",
      title: up.problem?.title ?? "",
      topicTag: up.problem?.topicTag ?? null,
      topicSlug: up.problem?.topic?.slug ?? null,
      topicName: up.problem?.topic?.name ?? "Unknown",
      nextReviewAt: up.nextReviewAt instanceof Date ? up.nextReviewAt : new Date(up.nextReviewAt),
    })),
    ...unseenProblems.map((problem) => ({
      kind: "new" as const,
      problemId: problem.id,
      title: problem.title,
      topicTag: problem.topicTag,
      topicSlug: problem.topic?.slug ?? null,
      topicName: problem.topic?.name ?? "Unknown",
      nextReviewAt: null,
    })),
  ];

  const enabled = await isFeatureEnabled(LEARNING_FEATURES.INTERLEAVED_PRACTICE);
  const queue = enabled ? buildInterleavedQueue<InterleavedInputItem>(merged) : merged;

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