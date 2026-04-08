import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createNotebookSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(800).optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notebooks = await prisma.notebook.findMany({
    where: { userId: session.user.id },
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createNotebookSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const notebook = await prisma.notebook.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });

  return NextResponse.json(notebook, { status: 201 });
}
