export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { calculateSM2, Rating, getStatusFromRepetitions } from "@/lib/sm2";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";
import { LearningMethod } from "@/lib/db-types";
import { z } from "zod";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

type UserProblemRecord = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date | string;
  lastReviewedAt: Date | string | null;
  status: string;
  [key: string]: unknown;
};

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findUnique(args?: Record<string, unknown>): Promise<DbRecord | null>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
};
type PrismaLikeClient = {
  userProblem: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

const reviewSchema = z.object({
  rating: z.number().min(0).max(5),
  timeTaken: z.number().min(0).optional(),
});

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
    const userProblem = await dbClient.userProblem.findUnique({
      where: {
        userId_problemId: {
          userId: userId,
          problemId,
        },
      },
    }) as UserProblemRecord | null;

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
    const updated = await dbClient.userProblem.update({
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
      `${new Date().toISOString()}:${problemId}:${Math.random().toString(36).slice(2, 8)}`,
      LearningMethod.SPACED_REPETITION,
      {
        problemId,
        rating,
        interval: sm2Result.interval,
        easeFactor: sm2Result.easeFactor,
        repetitions: sm2Result.repetitions,
        createdAt: new Date().toISOString(),
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
