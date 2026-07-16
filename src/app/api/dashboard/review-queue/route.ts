export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import {
  computePriorityScore,
  getOverdueDays,
  getUrgencyLabel,
  getForecastLabel,
  sortByPriority,
  type ScoredItem,
  type Difficulty,
} from "@/lib/learning/priorityScoring";

type DbRecord = Record<string, unknown>;

type UserProblemRecord = {
  id: string;
  nextReviewAt: Date | string;
  easeFactor: number;
  repetitions: number;
  difficulty: string;
  problem: {
    id: string;
    title: string;
    topicTag: string | null;
    topic: { slug: string; name: string } | null;
  } | null;
};

type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  count(args?: Record<string, unknown>): Promise<number>;
};

type PrismaLikeClient = { userProblem: DbModelDelegate };
const dbClient = db as unknown as PrismaLikeClient;

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const now = new Date();
  const cramMode = req.nextUrl.searchParams.get("cram") === "true";

  const rawProblems = await dbClient.userProblem.findMany({
    where: { userId: dbUser.id, nextReviewAt: { lte: now } },
    include: { problem: { include: { topic: true } } },
    orderBy: { nextReviewAt: "asc" },
    take: 100,
  }) as unknown as UserProblemRecord[];

  const scored: ScoredItem[] = rawProblems.map((up) => {
    const nextReview = up.nextReviewAt instanceof Date ? up.nextReviewAt : new Date(up.nextReviewAt);
    const overdueDays = getOverdueDays(nextReview);
    const difficulty = (up.difficulty as Difficulty) || "MEDIUM";
    const easeFactor = up.easeFactor ?? 2.5;

    return {
      id: up.problem?.id ?? up.id,
      title: up.problem?.title ?? "Unknown",
      topicTag: up.problem?.topicTag ?? null,
      topicSlug: up.problem?.topic?.slug ?? null,
      topicName: up.problem?.topic?.name ?? "Unknown",
      kind: "due" as const,
      nextReviewAt: nextReview,
      priorityScore: computePriorityScore({ overdueDays, easeFactor, difficulty }),
      overdueDays,
      easeFactor,
      difficulty,
    };
  });

  const sorted = cramMode
    ? sortByPriority(scored)
    : scored.sort((a, b) => (a.nextReviewAt?.getTime() ?? 0) - (b.nextReviewAt?.getTime() ?? 0));

  const items = sorted.slice(0, 50).map((item) => ({
    ...item,
    urgencyLabel: getUrgencyLabel(item.overdueDays, item.nextReviewAt),
    forecastLabel: getForecastLabel(item.nextReviewAt),
  }));

  const summary = {
    totalDue: scored.length,
    overdueCount: scored.filter((s) => s.overdueDays > 0).length,
    criticalCount: scored.filter((s) => s.overdueDays > 14).length,
    totalByDifficulty: {
      EASY: scored.filter((s) => s.difficulty === "EASY").length,
      MEDIUM: scored.filter((s) => s.difficulty === "MEDIUM").length,
      HARD: scored.filter((s) => s.difficulty === "HARD").length,
    },
  };

  return NextResponse.json({ items, summary });
}
