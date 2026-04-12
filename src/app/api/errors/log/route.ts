import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForClerkId(clerkUserId);
  const userId = dbUser.id;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const attempts = await prisma.problemAttempt.findMany({
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

  const weeklyByType = await prisma.problemAttempt.groupBy({
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
    ? await prisma.problem.findMany({
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
