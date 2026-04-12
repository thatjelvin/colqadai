import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateSM2, Rating, getStatusFromRepetitions } from "@/lib/sm2";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";
import { LearningMethod } from "@prisma/client";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().min(0).max(5),
  timeTaken: z.number().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForClerkId(clerkUserId);
    const userId = dbUser.id;

    if (!(await isFeatureEnabled(LEARNING_FEATURES.SPACED_REPETITION))) {
      return NextResponse.json({ error: "Spaced repetition is disabled" }, { status: 403 });
    }

    const problemId = params.id;
    const body = await req.json();
    
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid rating" },
        { status: 400 }
      );
    }

    const { rating, timeTaken } = parsed.data;

    // Get existing UserProblem
    const userProblem = await prisma.userProblem.findUnique({
      where: {
        userId_problemId: {
          userId: userId,
          problemId,
        },
      },
    });

    if (!userProblem) {
      return NextResponse.json(
        { error: "Problem not started" },
        { status: 404 }
      );
    }

    // Calculate new SM-2 state
    const sm2Result = calculateSM2(
      {
        easeFactor: userProblem.easeFactor,
        interval: userProblem.interval,
        repetitions: userProblem.repetitions,
      },
      rating as Rating,
      timeTaken
    );

    // Update UserProblem
    const updated = await prisma.userProblem.update({
      where: {
        userId_problemId: {
          userId: userId,
          problemId,
        },
      },
      data: {
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        nextReviewAt: sm2Result.nextReviewAt,
        lastReviewedAt: new Date(),
        timeTaken,
        status: getStatusFromRepetitions(sm2Result.repetitions),
      },
    });

    await upsertLearningAnalytics(
      userId,
      `${new Date().toISOString().slice(0, 10)}:${problemId}`,
      LearningMethod.SPACED_REPETITION,
      {
        problemId,
        rating,
        interval: sm2Result.interval,
        easeFactor: sm2Result.easeFactor,
        repetitions: sm2Result.repetitions,
      }
    );

    return NextResponse.json({
      ...updated,
      nextReviewAt: sm2Result.nextReviewAt,
      nextReviewDateLabel: sm2Result.nextReviewAt.toLocaleDateString(),
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
