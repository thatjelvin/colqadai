export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UsageFeature } from "@prisma/client";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { BillingLimitError, buildUpgradeErrorPayload, consumeUsage } from "@/lib/billing/usage";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;

    const problemId = params.id;

    // Check if UserProblem already exists
    const existing = await prisma.userProblem.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    await consumeUsage(userId, UsageFeature.PROBLEM_START, 1);

    // Create new UserProblem record
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userProblem = await prisma.userProblem.create({
      data: {
        userId: userId,
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
