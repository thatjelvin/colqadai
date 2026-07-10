export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { groq } from "@/lib/groq";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { z } from "zod";
import { BillingLimitError, buildUpgradeErrorPayload, consumeUsage, getBillingProfile } from "@/lib/billing/usage";
import { UsageFeature } from "@/lib/db-types";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findUnique(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
};

/** Specific record types for this file. */
type ChatSessionRecord = {
  id: string;
  title: string;
  problemId: string | null;
  messages: ChatMessageRecord[];
};

type ChatMessageRecord = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

type ProblemRecord = {
  id: string;
  body: string;
  solution: string;
};

type UserProblemRecord = {
  id: string;
};

type ProblemAttemptRecord = {
  id: string;
};

/** Typed database client — mirrors the models used in this file. */
type PrismaLikeClient = {
  chatSession: DbModelDelegate;
  chatMessage: DbModelDelegate;
  problem: DbModelDelegate;
  userProblem: DbModelDelegate;
  problemAttempt: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

const chatSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().nullable(),
  problemId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;

    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { message, sessionId, problemId } = parsed.data;

    await consumeUsage(userId, UsageFeature.CHAT_MESSAGE, 1);
    const billingProfile = await getBillingProfile(userId);

    // Get or create chat session
    let chatSession: ChatSessionRecord | null = null;

    if (sessionId) {
      chatSession = await dbClient.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      }) as ChatSessionRecord | null;
    }

    if (!chatSession) {
      await consumeUsage(userId, UsageFeature.NEW_CHAT_SESSION, 1);

      // Generate title from first message
      const title = await generateTitle(message);

      chatSession = await dbClient.chatSession.create({
        data: {
          userId,
          problemId,
          title,
        },
        include: {
          messages: true,
        },
      }) as ChatSessionRecord;
    }

    // Save user message
    await dbClient.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "USER",
        content: message,
      },
    });

    // Build system prompt
    let systemPrompt = "";

    if (problemId) {
      // Problem-scoped chat
      const problem = await dbClient.problem.findUnique({
        where: { id: problemId },
      }) as ProblemRecord | null;

      const userProblem = await dbClient.userProblem.findUnique({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
      }) as UserProblemRecord | null;

      if (!userProblem) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      if (problem) {
        const hasAttempt = await dbClient.problemAttempt.findFirst({
          where: {
            userId,
            problemId,
          },
          select: {
            id: true,
          },
        }) as ProblemAttemptRecord | null;

        const revealRule = hasAttempt
          ? "- The student has attempted this problem. You may discuss the full solution if explicitly requested."
          : "- The student has not attempted this problem yet. Do not provide the full worked solution; guide with hints and strategy first.";

        systemPrompt = `You are a math tutor helping a university student understand a problem.

Problem:
${problem.body}

Solution (do not reveal unless the student explicitly asks for it):
${problem.solution}

Your role:
- Guide the student toward understanding, not just the answer
- Ask Socratic questions when they're stuck
- Explain the underlying concept when needed
- Use LaTeX for all mathematical notation, wrapped in $...$ for inline and $$...$$ for display
- Be concise - this is a chat interface, not an essay
${revealRule}`;
      }
    } else {
      // Freeform chat
      systemPrompt = `You are a helpful mathematics assistant for university students.
Use LaTeX for all mathematical notation wrapped in $...$ for inline and $$...$$ for display math.
Be clear, rigorous, and concise.`;
    }

    // Build message history in OpenAI format
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...chatSession.messages.map((m) => ({
        role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const maxTokens = billingProfile.plan === "max" ? 4096 : 3000;

    // Create streaming response via Groq
    const groqStream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: maxTokens,
      stream: true,
    });

    // Create a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        for await (const chunk of groqStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          fullResponse += text;
          controller.enqueue(new TextEncoder().encode(text));
        }

        // Save assistant message to database
        await dbClient.chatMessage.create({
          data: {
            sessionId: chatSession.id,
            role: "ASSISTANT",
            content: fullResponse,
          },
        });
        
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Chat-Session-Id": chatSession.id,
      },
    });
  } catch (error) {
    if (error instanceof BillingLimitError) {
      return NextResponse.json(buildUpgradeErrorPayload(error), { status: error.status });
    }

    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}

async function generateTitle(message: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "Generate a short title (max 10 words, plain text, no quotes) for a chat that starts with the given message.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 20,
    });

    const text = response.choices[0]?.message?.content ?? "";
    return text.trim().slice(0, 50) || "New Chat";
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat";
  }
}

