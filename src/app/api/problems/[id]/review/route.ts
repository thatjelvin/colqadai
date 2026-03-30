import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSM2, Rating, getStatusFromRepetitions } from "@/lib/sm2";
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
          userId: session.user.id,
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
          userId: session.user.id,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
