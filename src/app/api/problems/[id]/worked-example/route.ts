import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { LearningMethod } from "@prisma/client";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";

const payloadSchema = z.object({
  studyDurationSeconds: z.number().int().min(0),
  generateAttempt: z.string().min(1),
  selfAssessedMatch: z.boolean(),
  sessionKey: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForClerkId(clerkUserId);
  const userId = dbUser.id;

  if (!(await isFeatureEnabled(LEARNING_FEATURES.WORKED_EXAMPLE_STUDY))) {
    return NextResponse.json({ error: "Worked Example Mode is disabled" }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.studyDurationSeconds < 60) {
    return NextResponse.json({ error: "Study phase must be at least 60 seconds" }, { status: 400 });
  }

  const userProblem = await prisma.userProblem.findUnique({
    where: {
      userId_problemId: {
        userId: userId,
        problemId: params.id,
      },
    },
  });

  const record = await prisma.workedExampleSession.create({
    data: {
      userId: userId,
      problemId: params.id,
      userProblemId: userProblem?.id,
      studyDurationSeconds: parsed.data.studyDurationSeconds,
      generateAttempt: parsed.data.generateAttempt,
      selfAssessedMatch: parsed.data.selfAssessedMatch,
    },
  });

  await upsertLearningAnalytics(
    userId,
    parsed.data.sessionKey || `${new Date().toISOString().slice(0, 10)}:${params.id}`,
    LearningMethod.WORKED_EXAMPLE_STUDY,
    {
      problemId: params.id,
      studyDurationSeconds: parsed.data.studyDurationSeconds,
      selfAssessedMatch: parsed.data.selfAssessedMatch,
    }
  );

  return NextResponse.json(record);
}
