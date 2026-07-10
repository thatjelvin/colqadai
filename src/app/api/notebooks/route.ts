import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

/** Typed database client cast for the in-memory DB proxy. */
type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
};

type NotebookRecord = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    documents: number;
    concepts: number;
  };
  summaries?: Array<{
    summary: string;
    updatedAt: Date | string;
  }>;
};

type PrismaLikeClient = {
  notebook: DbModelDelegate;
};

const dbClient = db as unknown as PrismaLikeClient;

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

  const notebooks = await dbClient.notebook.findMany({
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
  }) as unknown as NotebookRecord[];

  return NextResponse.json(
    notebooks.map((notebook) => ({
      id: notebook.id,
      title: notebook.title,
      description: notebook.description,
      createdAt: notebook.createdAt,
      updatedAt: notebook.updatedAt,
      documentsCount: notebook._count?.documents ?? 0,
      conceptsCount: notebook._count?.concepts ?? 0,
      latestSummaryAt: notebook.summaries?.[0]?.updatedAt ?? null,
      latestSummary: notebook.summaries?.[0]?.summary ?? null,
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

  const notebook = await dbClient.notebook.create({
    data: {
      userId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    },
  }) as unknown as NotebookRecord;

  return NextResponse.json(notebook, { status: 201 });
}