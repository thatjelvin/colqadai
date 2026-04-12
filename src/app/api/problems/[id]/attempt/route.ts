import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { LearningMethod } from "@prisma/client";
import { gradeAnswer, classifyError, generateElaborationPrompt } from "@/lib/learning/aiClassifiers";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";

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
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForClerkId(clerkUserId);
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
      prisma.problem.findUnique({ where: { id: problemId } }),
      prisma.userProblem.findUnique({
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

    const lastCorrectAttempt = await prisma.problemAttempt.findFirst({
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

    const currentCycleAttemptCount = await prisma.problemAttempt.count({
      where: {
        userId,
        problemId,
        createdAt: lastCorrectAttempt ? { gt: lastCorrectAttempt.createdAt } : undefined,
      },
    });

    const attemptNumber = currentCycleAttemptCount + 1;
    const grade = await gradeAnswer(problem.body, problem.solution, answer);

    const errorEnabled = await isFeatureEnabled(LEARNING_FEATURES.ERROR_ANALYSIS);
    const errorResult = !grade.isCorrect && errorEnabled
      ? await classifyError(problem.body, problem.solution, answer)
      : null;

    const attempt = await prisma.problemAttempt.create({
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
      await prisma.userProblem.update({
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

    const analyticsSession = sessionKey || `${new Date().toISOString().slice(0, 10)}:${problemId}`;

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
      ? await generateElaborationPrompt(problem.body, answer, problem.solution)
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
    });
  } catch (error) {
    console.error("Error creating attempt:", error);
    return NextResponse.json({ error: "Failed to create attempt" }, { status: 500 });
  }
}
