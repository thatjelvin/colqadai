import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import {
  generateConcepts,
  generateGroundedSummary,
  type ChunkWithId,
} from "@/lib/notebooks/processing";

type Context = { params: { id: string } };

export async function POST(_: Request, { params }: Context) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const notebook = await db.notebook.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  const chunks = await db.notebookChunk.findMany({
    where: {
      notebookId: notebook.id,
      userId: userId,
    },
    orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }],
    select: {
      id: true,
      content: true,
    },
  });

  if (chunks.length === 0) {
    return NextResponse.json({ error: "Upload at least one source document first" }, { status: 400 });
  }

  const chunkData: ChunkWithId[] = chunks.map((chunk) => ({ id: chunk.id, content: chunk.content }));
  const generatedSummary = generateGroundedSummary(chunkData);
  const generatedConcepts = generateConcepts(chunkData);

  const result = await db.$transaction(async (tx) => {
    await tx.notebookSummary.deleteMany({
      where: {
        notebookId: notebook.id,
        userId: userId,
      },
    });

    await tx.notebookConcept.deleteMany({
      where: {
        notebookId: notebook.id,
        userId: userId,
      },
    });

    const summary = await tx.notebookSummary.create({
      data: {
        notebookId: notebook.id,
        userId: userId,
        summary: generatedSummary.summary,
        keyPoints: generatedSummary.keyPoints,
        sourceChunkIds: generatedSummary.sourceChunkIds,
      },
    });

    if (generatedConcepts.length > 0) {
      await tx.notebookConcept.createMany({
        data: generatedConcepts.map((concept) => ({
          notebookId: notebook.id,
          userId: userId,
          name: concept.name,
          explanation: concept.explanation,
          evidenceChunkIds: concept.evidenceChunkIds,
          confidence: concept.confidence,
        })),
      });
    }

    await tx.notebook.update({
      where: { id: notebook.id },
      data: { updatedAt: new Date() },
    });

    return summary;
  });

  return NextResponse.json({
    summary: result,
    conceptsCount: generatedConcepts.length,
  });
}
