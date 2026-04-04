// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { z } from "zod";
import { BillingLimitError, buildUpgradeErrorPayload, consumeUsage, getBillingProfile } from "@/lib/billing/usage";
import { UsageFeature } from "@prisma/client";

const chatSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().nullable(),
  problemId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { message, sessionId, problemId } = parsed.data;
    const userId = session.user.id;

    await consumeUsage(userId, UsageFeature.CHAT_MESSAGE, 1);
    const billingProfile = await getBillingProfile(userId);

    // Get or create chat session
    let chatSession;
    
    if (sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    if (!chatSession) {
      await consumeUsage(userId, UsageFeature.NEW_CHAT_SESSION, 1);

      // Generate title from first message
      const title = await generateTitle(message);
      
      chatSession = await prisma.chatSession.create({
        data: {
          userId,
          problemId,
          title,
        },
        include: {
          messages: true,
        },
      });
    }

    // Save user message
    await prisma.chatMessage.create({
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
      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
      });
      
      const userProblem = await prisma.userProblem.findUnique({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
      });

      if (!userProblem) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      if (problem) {
        const hasAttempt = await prisma.problemAttempt.findFirst({
          where: {
            userId,
            problemId,
          },
          select: {
            id: true,
          },
        });

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

    // Build message history
    const messages = chatSession.messages.map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    // Create streaming response
    const stream = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20251101",
      max_tokens: billingProfile.plan === "max" ? 4096 : 3000,
      system: systemPrompt,
      messages: messages as any,
      stream: true,
    });

    // Create a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta") {
            const text = chunk.delta.text || "";
            fullResponse += text;
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
        
        // Save assistant message to database
        await prisma.chatMessage.create({
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
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20251101",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Generate a short title (max 10 words, plain text, no quotes) for a chat that starts with this message: "${message}"`,
        },
      ],
    });

    return response.content[0].type === "text" 
      ? response.content[0].text.trim().slice(0, 50)
      : "New Chat";
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat";
  }
}
