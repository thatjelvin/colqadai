import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

const createNotebookSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(800).optional().nullable(),
});

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const notebooks = await db.notebook.findMany({
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
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const parsed = createNotebookSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const notebook = await db.notebook.create({
    data: {
      userId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });

  return NextResponse.json(notebook, { status: 201 });
}
