import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateConcepts,
  generateGroundedSummary,
  type ChunkWithId,
} from "@/lib/notebooks/processing";

type Context = { params: { id: string } };

export async function POST(_: Request, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notebook = await prisma.notebook.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  const chunks = await prisma.notebookChunk.findMany({
    where: {
      notebookId: notebook.id,
      userId: session.user.id,
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

  const result = await prisma.$transaction(async (tx) => {
    await tx.notebookSummary.deleteMany({
      where: {
        notebookId: notebook.id,
        userId: session.user.id,
      },
    });

    await tx.notebookConcept.deleteMany({
      where: {
        notebookId: notebook.id,
        userId: session.user.id,
      },
    });

    const summary = await tx.notebookSummary.create({
      data: {
        notebookId: notebook.id,
        userId: session.user.id,
        summary: generatedSummary.summary,
        keyPoints: generatedSummary.keyPoints,
        sourceChunkIds: generatedSummary.sourceChunkIds,
      },
    });

    if (generatedConcepts.length > 0) {
      await tx.notebookConcept.createMany({
        data: generatedConcepts.map((concept) => ({
          notebookId: notebook.id,
          userId: session.user.id,
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
