import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import topicsData from "@/data/topics.json";
import { groq } from "@/lib/groq";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().min(1),
});

const collyIntentSchema = z.enum([
  "GREETING",
  "NAVIGATION",
  "STUDY_HELP",
  "TOPIC_EXPLORATION",
  "REVIEW_DUE",
  "UNCLEAR",
]);
type CollyIntent = z.infer<typeof collyIntentSchema>;

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

const collyIntentPrompt = `You are an intent classifier for Colqad, a university math learning app.
Return exactly one label from this list:
- GREETING
- NAVIGATION
- STUDY_HELP
- TOPIC_EXPLORATION
- REVIEW_DUE
- UNCLEAR

Rules:
- Greetings, thanks, pleasantries, small talk => GREETING
- "What can I do here?", "How does this app work?", "where do I click?" => NAVIGATION
- Math help, concept explanation, solving steps, tutoring requests => STUDY_HELP
- Topic lookup/browse/explore/discover subject requests => TOPIC_EXPLORATION
- "what is due?", "how many reviews due?", "what should I review now?" => REVIEW_DUE
- If ambiguous or insufficient context => UNCLEAR

Output only the label with no punctuation.`;
const topicsContext = JSON.stringify(topicsData);

function extractActionJson(text: string): { action: "navigate"; path: string } | null {
  const candidates = text.match(/\{[\s\S]*?\}/g) ?? [];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.action === "navigate" && typeof parsed?.path === "string") {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function stripActionJson(text: string) {
  return text.replace(/\{[\s\S]*?\}/g, "").trim();
}

function normalizeIntent(raw: string): CollyIntent {
  const upper = raw.toUpperCase();
  for (const label of collyIntentSchema.options) {
    if (upper.includes(label)) {
      return label;
    }
  }
  return "UNCLEAR";
}

async function classifyIntent(message: string): Promise<CollyIntent> {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    max_tokens: 24,
    messages: [
      {
        role: "system",
        content: collyIntentPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  return normalizeIntent(content);
}

async function getDueReviewCount(userId: string): Promise<number> {
  const supabase = createServerClient();
  const endOfTodayUtc = new Date();
  endOfTodayUtc.setUTCHours(23, 59, 59, 999);

  const { count, error } = await supabase
    .from("user_topic_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("next_review_due", endOfTodayUtc.toISOString());

  if (!error) {
    return count ?? 0;
  }

  if (error.code === "42703") {
    const fallback = await supabase
      .from("user_topic_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review_date", endOfTodayUtc.toISOString());

    if (!fallback.error) {
      return fallback.count ?? 0;
    }
  }

  throw new Error(`Failed to fetch due review count: ${error.message}`);
}

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

    const messageInput = parsed.data.message.trim();
    const intent = await classifyIntent(messageInput);

    if (intent === "GREETING") {
      return NextResponse.json({
        message: "Hey! I’m Colly 👋 Tell me what you want to work on and I’ll point you to the right place.",
      });
    }

    if (intent === "NAVIGATION") {
      return NextResponse.json({
        message: "Here’s what you can do in Colqad right now:",
        actions: [
          { label: "Explore topics", path: "/topics" },
          { label: "Start review", path: "/review" },
          { label: "Practice problems", path: "/study" },
          { label: "Check gaps", path: "/gaps" },
        ],
      });
    }

    if (intent === "STUDY_HELP") {
      return NextResponse.json({
        message: "Great question. Open a topic first, then use the tutor for guided math help while you practice.",
        actions: [
          { label: "Open topics", path: "/topics" },
          { label: "Practice problems", path: "/study" },
        ],
      });
    }

    if (intent === "REVIEW_DUE") {
      const dueCount = await getDueReviewCount(user.id);
      return NextResponse.json({
        message: `You have ${dueCount} topic${dueCount === 1 ? "" : "s"} due for review today.`,
        actions: [{ label: "Go to review queue", path: "/review" }],
      });
    }

    if (intent === "UNCLEAR") {
      return NextResponse.json({
        message: "Do you want to explore topics, start reviews, or get math help with a specific concept?",
        actions: [
          { label: "Explore topics", path: "/topics" },
          { label: "Start review", path: "/review" },
        ],
      });
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
          content: `Known topics list (full context): ${topicsContext}\n\nUser message: ${messageInput}`,
        },
      ],
    });

    const rawMessage = response.choices[0]?.message?.content ?? "";
    const action = extractActionJson(rawMessage);
    const cleanMessage = stripActionJson(rawMessage) || rawMessage;

    return NextResponse.json({
      message: cleanMessage,
      actions: action ? [{ label: "Open suggested topic", path: action.path }] : [],
    });
  } catch (error) {
    console.error("Colly API error", error);
    return NextResponse.json({ error: "Failed to process Colly request" }, { status: 500 });
  }
}
