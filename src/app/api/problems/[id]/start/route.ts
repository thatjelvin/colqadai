import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsageFeature } from "@prisma/client";
import { BillingLimitError, buildUpgradeErrorPayload, consumeUsage } from "@/lib/billing/usage";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const problemId = params.id;

    // Check if UserProblem already exists
    const existing = await prisma.userProblem.findUnique({
      where: {
        userId_problemId: {
          userId: session.user.id,
          problemId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    await consumeUsage(session.user.id, UsageFeature.PROBLEM_START, 1);

    // Create new UserProblem record
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userProblem = await prisma.userProblem.create({
      data: {
        userId: session.user.id,
        problemId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewAt: tomorrow,
        status: "LEARNING",
      },
    });

    return NextResponse.json(userProblem);
  } catch (error) {
    if (error instanceof BillingLimitError) {
      return NextResponse.json(buildUpgradeErrorPayload(error), { status: error.status });
    }

    console.error("Error starting problem:", error);
    return NextResponse.json(
      { error: "Failed to start problem" },
      { status: 500 }
    );
  }
}
