import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

const reflectionSchema = z.object({
  problemId: z.string().min(1),
  attemptId: z.string().optional(),
  prompt: z.string().min(1),
  response: z.string().min(1),
});

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const reflections = await db.reflection.findMany({
    where: { userId },
    include: {
      problem: {
        include: { topic: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(reflections);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const parsed = reflectionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reflection payload" }, { status: 400 });
  }

  const { problemId, attemptId, prompt, response } = parsed.data;

  // Verify the problem belongs to the user
  const userProblem = await db.userProblem.findUnique({
    where: { userId_problemId: { userId: userId, problemId } },
  });

  if (!userProblem) {
    return NextResponse.json({ error: "Unauthorized access to problem" }, { status: 403 });
  }

  // If linking to an attempt, verify it belongs to the user
  if (attemptId) {
    const defaultAttempt = await db.problemAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true },
    });
    if (!defaultAttempt || defaultAttempt.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to attempt" }, { status: 403 });
    }
  }

  const reflection = await db.reflection.create({
    data: {
      userId: userId,
      problemId,
      attemptId,
      prompt,
      response,
    },
  });

  return NextResponse.json(reflection);
}
