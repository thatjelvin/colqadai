import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NotebookSourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  chunkText,
  hashContent,
  normalizeSourceText,
  readPdfTextFromBase64,
} from "@/lib/notebooks/processing";

const ingestSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("TEXT"),
    title: z.string().min(1).max(200),
    textContent: z.string().min(1),
    mimeType: z.string().optional(),
    byteSize: z.number().int().positive().optional(),
  }),
  z.object({
    sourceType: z.literal("PDF"),
    title: z.string().min(1).max(200),
    pdfBase64: z.string().min(1),
    mimeType: z.string().optional(),
    byteSize: z.number().int().positive().optional(),
  }),
]);

type Context = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Context) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) { return new Response("Unauthorized", { status: 401 }); }
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) { return new Response("User not found in DB", { status: 404 }); }
  const session = { user: { id: dbUser.id, name: dbUser.name } };
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

  const documents = await prisma.notebookDocument.findMany({
    where: { notebookId: notebook.id, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest, { params }: Context) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) { return new Response("Unauthorized", { status: 401 }); }
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) { return new Response("User not found in DB", { status: 404 }); }
  const session = { user: { id: dbUser.id, name: dbUser.name } };
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

  const parsed = ingestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ingestion payload" }, { status: 400 });
  }

  const textContent =
    parsed.data.sourceType === "TEXT"
      ? normalizeSourceText(parsed.data.textContent)
      : await readPdfTextFromBase64(parsed.data.pdfBase64);

  if (!textContent) {
    return NextResponse.json(
      { error: "Unable to extract text from source material" },
      { status: 422 }
    );
  }

  const chunks = chunkText(textContent);
  const sourceType = parsed.data.sourceType as NotebookSourceType;

  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.notebookDocument.create({
      data: {
        notebookId: notebook.id,
        userId: session.user.id,
        title: parsed.data.title.trim(),
        sourceType,
        mimeType:
          parsed.data.mimeType ||
          (sourceType === NotebookSourceType.PDF ? "application/pdf" : "text/plain"),
        byteSize: parsed.data.byteSize,
        rawText: textContent,
        contentHash: hashContent(textContent),
        ingestionStatus: "PROCESSED",
        chunkCount: chunks.length,
        charCount: textContent.length,
        storageMetadata: {
          sourceType,
          ingestedAt: new Date().toISOString(),
          chunkSize: 1200,
          chunkOverlap: 200,
        },
      },
    });

    if (chunks.length > 0) {
      await tx.notebookChunk.createMany({
        data: chunks.map((content, chunkIndex) => ({
          notebookId: notebook.id,
          documentId: created.id,
          userId: session.user.id,
          chunkIndex,
          content,
          contentHash: hashContent(content),
          charCount: content.length,
        })),
      });
    }

    await tx.notebook.update({
      where: { id: notebook.id },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  return NextResponse.json(document, { status: 201 });
}
