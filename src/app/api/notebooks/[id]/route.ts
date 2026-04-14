import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

type Context = { params: { id: string } };

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  return dbUser.id;
}

export async function GET(_: Request, { params }: Context) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notebook = await prisma.notebook.findFirst({
    where: {
      id: params.id,
      userId,
    },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
      summaries: {
        orderBy: { createdAt: "desc" },
      },
      concepts: {
        orderBy: [{ createdAt: "desc" }, { confidence: "desc" }],
      },
    },
  });

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  return NextResponse.json(notebook);
}

export async function DELETE(_: Request, { params }: Context) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notebook = await prisma.notebook.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  await prisma.notebook.delete({ where: { id: notebook.id } });
  return NextResponse.json({ success: true });
}
