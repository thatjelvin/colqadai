import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import topicsData from "@/data/topics.json";
import { groq } from "@/lib/groq";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().min(1),
});

const collySystemPrompt = `You are Colly, the AI assistant for Colqad, a university math learning app. You help students navigate the app, find topics, start reviews, and understand math concepts.

You have access to the following app actions. When the user's intent matches one of these, respond with the action JSON alongside your message:

- Navigate to a topic summary: { "action": "navigate", "path": "/explore/[slug]" }
- Open the topics browser: { "action": "navigate", "path": "/topics" }
- Start a review session: { "action": "navigate", "path": "/review/[slug]" }
- Open the dashboard: { "action": "navigate", "path": "/dashboard" }

To find the correct slug, match the user's input against the known topic list provided in context.

If the user is asking about a math concept, give a brief helpful explanation and suggest the relevant topic page.
If the user is new or unsure what to do, guide them to search for a topic they want to study.
If no app action is needed, just respond conversationally.

Always be concise, warm, and encouraging. You are talking to a university student.`;
const topicsContext = JSON.stringify(topicsData);

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: collySystemPrompt,
        },
        {
          role: "user",
          content: `Known topics list (full context): ${topicsContext}\n\nUser message: ${parsed.data.message}`,
        },
      ],
    });

    const message = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Colly API error", error);
    return NextResponse.json({ error: "Failed to process Colly request" }, { status: 500 });
  }
}
