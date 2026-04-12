import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

const createNotebookSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(800).optional().nullable(),
});

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForClerkId(clerkUserId);
  const userId = dbUser.id;

  const notebooks = await prisma.notebook.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          documents: true,
          concepts: true,
        },
      },
      summaries: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          summary: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    notebooks.map((notebook) => ({
      id: notebook.id,
      title: notebook.title,
      description: notebook.description,
      createdAt: notebook.createdAt,
      updatedAt: notebook.updatedAt,
      documentsCount: notebook._count.documents,
      conceptsCount: notebook._count.concepts,
      latestSummaryAt: notebook.summaries[0]?.updatedAt ?? null,
      latestSummary: notebook.summaries[0]?.summary ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForClerkId(clerkUserId);
  const userId = dbUser.id;

  const parsed = createNotebookSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const notebook = await prisma.notebook.create({
    data: {
      userId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });

  return NextResponse.json(notebook, { status: 201 });
}
