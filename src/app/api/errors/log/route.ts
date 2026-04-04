// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
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
