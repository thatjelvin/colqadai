export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { LearningMethod } from "@/lib/db-types";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { upsertLearningAnalytics } from "@/lib/learning/analytics";

/** Typed database client cast for the in-memory DB proxy. */
type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findUnique(args?: Record<string, unknown>): Promise<DbRecord | null>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
};
type PrismaLikeClient = {
  userProblem: DbModelDelegate;
  workedExampleSession: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

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
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
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

  const userProblem = await dbClient.userProblem.findUnique({
    where: {
      userId_problemId: {
        userId: userId,
        problemId: params.id,
      },
    },
  });

  const record = await dbClient.workedExampleSession.create({
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
