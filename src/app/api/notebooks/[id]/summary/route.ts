import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import {
  generateConcepts,
  generateGroundedSummary,
  type ChunkWithId,
} from "@/lib/notebooks/processing";

/** Typed database client cast for the in-memory DB proxy. */
type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  deleteMany(args?: Record<string, unknown>): Promise<DbRecord>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  createMany(args?: Record<string, unknown>): Promise<DbRecord>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
};
type PrismaLikeClient = {
  notebook: DbModelDelegate;
  notebookChunk: DbModelDelegate;
  notebookSummary: DbModelDelegate;
  notebookConcept: DbModelDelegate;
  $transaction: <T>(fn: (tx: PrismaLikeClient) => Promise<T>) => Promise<T>;
};
const dbClient = db as unknown as PrismaLikeClient;

type Context = { params: { id: string } };

export async function POST(_: Request, { params }: Context) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const notebook = await dbClient.notebook.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  const chunks = await dbClient.notebookChunk.findMany({
    where: {
      notebookId: notebook.id,
      userId: userId,
    },
    orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }],
    select: {
      id: true,
      content: true,
    },
  }) as unknown as { id: string; content: string }[];

  if (chunks.length === 0) {
    return NextResponse.json({ error: "Add at least one source document first" }, { status: 400 });
  }

  const chunkData: ChunkWithId[] = chunks.map((chunk: { id: string; content: string }) => ({
    id: chunk.id,
    content: chunk.content,
  }));
  const generatedSummary = generateGroundedSummary(chunkData);
  const generatedConcepts = generateConcepts(chunkData);

  const result = await dbClient.$transaction(async (tx) => {
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
