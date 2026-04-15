import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

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

  const attempts = await db.problemAttempt.findMany({
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
  });

  const weeklyByType = await db.problemAttempt.groupBy({
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
  });

  const topError = weeklyByType.find((row) => row.errorType);

  const targetedProblems = topError?.errorType
    ? await db.problem.findMany({
        take: 3,
        include: { topic: true },
      })
    : [];

  return NextResponse.json({
    attempts,
    weeklySummary: topError
      ? {
          errorType: topError.errorType,
          count: topError._count._all,
          targetedProblems,
        }
      : null,
  });
}
