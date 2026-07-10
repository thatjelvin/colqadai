import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

type ProblemAttemptRecord = {
  createdAt: Date | string;
  problem: {
    topic: {
      name: string;
      slug: string;
    } | null;
  } | null;
  _count?: {
    _all: number;
  };
  errorType: string | null;
};

type ProblemRecord = {
  id: string;
  title: string;
  topic: {
    name: string;
    slug: string;
  } | null;
};

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  groupBy(args?: Record<string, unknown>): Promise<DbRecord[]>;
};

type PrismaLikeClient = {
  problemAttempt: DbModelDelegate;
  problem: DbModelDelegate;
};

const dbClient = db as unknown as PrismaLikeClient;

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const attempts = await dbClient.problemAttempt.findMany({
    where: {
      userId,
      isCorrect: false,
    },
    include: {
      problem: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 300,
  }) as unknown as ProblemAttemptRecord[];

  const weeklyByType = await dbClient.problemAttempt.groupBy({
    by: ["errorType"],
    where: {
      userId,
      isCorrect: false,
      createdAt: {
        gte: oneWeekAgo,
      },
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        errorType: "desc",
      },
    },
  }) as unknown as ProblemAttemptRecord[];

  const topError = weeklyByType.find((row) => row.errorType);
  const targetedProblems = topError?.errorType
    ? await dbClient.problem.findMany({
        take: 3,
        include: { topic: true },
      }) as unknown as ProblemRecord[]
    : [];

  const weeklySummary =
    topError
      ? {
          errorType: topError.errorType!,
          count: topError._count?._all ?? 0,
          targetedProblems,
        }
      : null;

  return NextResponse.json({
    attempts,
    weeklySummary,
  });
}