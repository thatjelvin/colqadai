import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reflectionSchema = z.object({
  problemId: z.string().min(1),
  attemptId: z.string().optional(),
  prompt: z.string().min(1),
  response: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reflections = await prisma.reflection.findMany({
    where: { userId: session.user.id },
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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reflectionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reflection payload" }, { status: 400 });
  }

  const reflection = await prisma.reflection.create({
    data: {
      userId: session.user.id,
      problemId: parsed.data.problemId,
      attemptId: parsed.data.attemptId,
      prompt: parsed.data.prompt,
      response: parsed.data.response,
    },
  });

  return NextResponse.json(reflection);
}
