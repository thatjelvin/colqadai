export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { LearningMethod } from "@/lib/db-types";
import { gradeAnswer, classifyError, generateElaborationPrompt } from "@/lib/learning/aiClassifiers";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findUnique(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
};
type PrismaLikeClient = {
  problem: DbModelDelegate;
  userProblem: DbModelDelegate;
  problemAttempt: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

const attemptSchema = z.object({
  answer: z.string().min(1),
  selfQuizMode: z.boolean().optional().default(false),
  sessionKey: z.string().optional(),
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

    if (!(await isFeatureEnabled(LEARNING_FEATURES.RETRIEVAL_PRACTICE))) {
      return NextResponse.json({ error: "Retrieval practice is currently disabled" }, { status: 403 });
    }

    const parsed = attemptSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const problemId = params.id;
    const { answer, selfQuizMode, sessionKey } = parsed.data;

    const [problem, userProblem] = await Promise.all([
      dbClient.problem.findUnique({ where: { id: problemId } }),
      dbClient.userProblem.findUnique({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
      }),
    ]);

    if (!problem || !userProblem) {
      return NextResponse.json({ error: "Problem is not available for this user" }, { status: 404 });
    }

    const problemBody = problem.body as string;
    const problemSolution = problem.solution as string;

    const lastCorrectAttempt = await dbClient.problemAttempt.findFirst({
      where: {
        userId,
        problemId,
        isCorrect: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    });

    const currentCycleAttemptCount = await dbClient.problemAttempt.count({
      where: {
        userId,
        problemId,
        createdAt: lastCorrectAttempt ? { gt: lastCorrectAttempt.createdAt } : undefined,
      },
    });

    const attemptNumber = currentCycleAttemptCount + 1;
    const grade = await gradeAnswer(problemBody, problemSolution, answer);

    const errorEnabled = await isFeatureEnabled(LEARNING_FEATURES.ERROR_ANALYSIS);
    const errorResult = !grade.isCorrect && errorEnabled
      ? await classifyError(problemBody, problemSolution, answer)
      : null;

    const attempt = await dbClient.problemAttempt.create({
      data: {
        userId,
        problemId,
        userProblemId: userProblem.id,
        userAnswer: answer,
        isCorrect: grade.isCorrect,
        attemptNumber,
        attemptsBeforeCorrect: grade.isCorrect ? attemptNumber : 0,
        selfQuizMode,
        errorType: errorResult?.errorType,
        errorExplanation: errorResult?.explanation,
      },
    });

    if (grade.isCorrect) {
      await dbClient.userProblem.update({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
        data: {
          attemptsBeforeCorrect: attemptNumber,
        },
      });
    }

    const analyticsSession = sessionKey
      || `${new Date().toISOString()}:${problemId}:attempt:${Math.random().toString(36).slice(2, 8)}`;

    await upsertLearningAnalytics(userId, analyticsSession, LearningMethod.RETRIEVAL_PRACTICE, {
      problemId,
      isCorrect: grade.isCorrect,
      attemptNumber,
      solvedOnFirstAttempt: grade.isCorrect && attemptNumber === 1,
      selfQuizMode,
    });

    if (errorResult) {
      await upsertLearningAnalytics(userId, analyticsSession, LearningMethod.ERROR_ANALYSIS, {
        problemId,
        errorType: errorResult.errorType,
      });
    }

    const elaborationEnabled = await isFeatureEnabled(LEARNING_FEATURES.ELABORATIVE_INTERROGATION);
    const elaborationPrompt = grade.isCorrect && elaborationEnabled
      ? await generateElaborationPrompt(problemBody, answer, problemSolution)
      : null;

    if (elaborationPrompt) {
      await upsertLearningAnalytics(userId, analyticsSession, LearningMethod.ELABORATIVE_INTERROGATION, {
        problemId,
        promptGenerated: true,
      });
    }

    return NextResponse.json({
      attemptId: attempt.id,
      isCorrect: grade.isCorrect,
      rationale: grade.rationale,
      attemptNumber,
      attemptsBeforeCorrect: grade.isCorrect ? attemptNumber : null,
      errorAnalysis: errorResult,
      elaborationPrompt,
      revealAllowed: true,
      gradingUnavailable: grade.gradingUnavailable ?? false,
    });
  } catch (error) {
    console.error("Error creating attempt:", error);
    return NextResponse.json({ error: "Failed to create attempt" }, { status: 500 });
  }
}
