export const dynamic = "force-dynamic";

import { AlertTriangle } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ReviewSessionClient,
  type BriefingDetails,
  type ReviewDifficulty,
  type ReviewQuestion,
} from "@/components/review/ReviewSessionClient";

const questionSchema = z.object({
  question: z.string().min(1),
  solution: z.string().min(1),
  hint: z.string().min(1),
  source: z.string().optional(),
});

const generatedQuestionsSchema = z.object({
  beginner: z.array(questionSchema).length(4),
  intermediate: z.array(questionSchema).length(4),
  advanced: z.array(questionSchema).length(4),
});

type TopicReviewQuestionRow = {
  id: string;
  difficulty: ReviewDifficulty;
  question: string;
  solution: string;
  hint: string | null;
  source: string | null;
  created_at: string;
};

type UserReviewResponseRow = {
  rating: "got_it" | "almost" | "didnt_get_it";
  reviewed_at: string;
  topic_review_questions: { difficulty: ReviewDifficulty } | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";
  return code === "42P01" || message.includes("does not exist");
}

function formatLastReviewedLabel(daysSinceLastReview: number, hasHistory: boolean) {
  if (!hasHistory) {
    return "You haven't reviewed this topic before";
  }
  if (daysSinceLastReview === 0) {
    return "Last reviewed today";
  }
  return `Last reviewed ${daysSinceLastReview} day${daysSinceLastReview === 1 ? "" : "s"} ago`;
}

function extractJsonContent(rawContent: string) {
  return rawContent
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function generateQuestions(
  subtopicName: string,
  parentTopicName: string
): Promise<z.infer<typeof generatedQuestionsSchema>> {
  const baseMessages = [
    {
      role: "system",
      content:
        "You are a university mathematics question writer. Return only valid JSON. No markdown. No preamble.",
    },
    {
      role: "user",
      content: `Generate 12 practice questions for the university math topic "${subtopicName}" (part of "${parentTopicName}").

Return a JSON object with exactly this structure:
{
  "beginner": [
    {
      "question": "question text. Use LaTeX for all math.",
      "solution": "full step-by-step solution with reasoning",
      "hint": "one sentence hint"
    }
  ],
  "intermediate": [ same structure, 4 questions ],
  "advanced": [ same structure, 4 questions ]
}

Beginner questions should test direct application of definitions and basic calculations.
Intermediate questions should require combining multiple concepts or multi-step reasoning.
Advanced questions should resemble past university exam questions — proof-based, abstract, or multi-part.

Also search for 1-2 publicly available open educational questions on this topic from universities or well-known sources (MIT OpenCourseWare, Khan Academy, publicly shared past papers) and include them in the advanced tier with a note indicating the source. Do not copy questions verbatim—generate original variants inspired by these sources only.

Return only valid JSON. No markdown. No preamble.`,
    },
  ] as const;

  // Attempt with web search enabled; if unsupported/unavailable, fallback payload is used below.
  const withSearchPayload = {
    model: "llama-3.3-70b-versatile",
    temperature: 0.35,
    messages: baseMessages,
    response_format: { type: "json_object" as const },
    tools: [{ type: "web_search_preview" }],
    tool_choice: "required",
  };

  const fallbackPayload = {
    model: "llama-3.3-70b-versatile",
    temperature: 0.35,
    messages: [
      ...baseMessages.slice(0, 1),
      {
        role: "user",
        content: `${baseMessages[1].content}

If web search is unavailable, generate all 12 questions from model knowledge and skip the sourcing note.`,
      },
    ],
    response_format: { type: "json_object" as const },
  };

  let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(withSearchPayload),
  });

  if (!response.ok) {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(fallbackPayload),
    });
  }

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Groq question generation failed (${response.status}): ${payload}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;

  if (typeof rawContent !== "string") {
    throw new Error("Groq did not return question content");
  }

  const parsed = JSON.parse(extractJsonContent(rawContent));
  return generatedQuestionsSchema.parse(parsed);
}

function orderQuestions(questions: TopicReviewQuestionRow[]): ReviewQuestion[] {
  const rank: Record<ReviewDifficulty, number> = {
    beginner: 0,
    intermediate: 1,
    advanced: 2,
  };

  return questions
    .slice()
    .sort((a, b) => {
      const diffCompare = rank[a.difficulty] - rank[b.difficulty];
      if (diffCompare !== 0) {
        return diffCompare;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      question: q.question,
      solution: q.solution,
      hint: q.hint,
      source: q.source,
    }));
}

async function getOrCreateReviewQuestions(topicSlug: string, subtopicName: string, parentTopicName: string) {
  const supabase = createServerClient();

  const { data: existingRows, error: readError } = await supabase
    .from("topic_review_questions")
    .select("id, difficulty, question, solution, hint, source, created_at")
    .eq("topic_slug", topicSlug);

  if (readError) {
    if (isMissingTableError(readError)) {
      throw new Error("MISSING_REVIEW_TABLES");
    }
    console.warn("Failed to read topic review questions", readError);
  }

  const existing = (existingRows ?? []) as TopicReviewQuestionRow[];
  const tierCounts = existing.reduce<Record<ReviewDifficulty, number>>(
    (acc, item) => {
      acc[item.difficulty] += 1;
      return acc;
    },
    { beginner: 0, intermediate: 0, advanced: 0 }
  );

  if (
    existing.length >= 12 &&
    tierCounts.beginner >= 4 &&
    tierCounts.intermediate >= 4 &&
    tierCounts.advanced >= 4
  ) {
    return orderQuestions(existing);
  }

  if (existing.length > 0) {
    const { error: deleteError } = await supabase.from("topic_review_questions").delete().eq("topic_slug", topicSlug);
    if (deleteError) {
      throw new Error(`Failed to reset stale questions: ${deleteError.message}`);
    }
  }

  const generated = await generateQuestions(subtopicName, parentTopicName);

  const rowsToInsert: Array<{
    topic_slug: string;
    difficulty: ReviewDifficulty;
    question: string;
    solution: string;
    hint: string;
    source: string | null;
  }> = [];

  (Object.keys(generated) as ReviewDifficulty[]).forEach((difficulty) => {
    generated[difficulty].forEach((question) => {
      rowsToInsert.push({
        topic_slug: topicSlug,
        difficulty,
        question: question.question,
        solution: question.solution,
        hint: question.hint,
        source: question.source ?? null,
      });
    });
  });

  const { error: insertError } = await supabase.from("topic_review_questions").insert(rowsToInsert);
  if (insertError) {
    if (isMissingTableError(insertError)) {
      throw new Error("MISSING_REVIEW_TABLES");
    }
    throw new Error(`Failed to store review questions: ${insertError.message}`);
  }

  const { data: storedRows, error: fetchStoredError } = await supabase
    .from("topic_review_questions")
    .select("id, difficulty, question, solution, hint, source, created_at")
    .eq("topic_slug", topicSlug);

  if (fetchStoredError) {
    if (isMissingTableError(fetchStoredError)) {
      throw new Error("MISSING_REVIEW_TABLES");
    }
    throw new Error(`Failed to read stored review questions: ${fetchStoredError.message}`);
  }

  return orderQuestions((storedRows ?? []) as TopicReviewQuestionRow[]);
}

async function generateWarmupNote(
  subtopicName: string,
  parentTopicName: string,
  daysSinceLastReview: number,
  hasHistory: boolean
) {
  const reviewTimingText = hasHistory
    ? `They last studied this ${daysSinceLastReview} days ago.`
    : "They have not studied this topic before.";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 250,
      messages: [
        {
          role: "user",
          content: `The student is about to review "${subtopicName}" (part of "${parentTopicName}"). ${reviewTimingText}

Write a 2-3 sentence warm-up message that:
- Briefly reminds them of the core idea of this topic without giving away answers
- References how long it has been since they last studied it
- Encourages them to focus and attempt each question before revealing hints

Do not list formulas. Do not give examples. Keep it motivational and contextual.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return "Take a breath and focus on the core ideas before jumping in. Work each question first, then use hints only when needed.";
  }

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content?.trim() ??
    "Take a breath and focus on the core ideas before jumping in. Work each question first, then use hints only when needed."
  );
}

async function getBriefingData(
  userId: string,
  topicSlug: string,
  subtopicName: string,
  parentTopicName: string
): Promise<BriefingDetails> {
  const supabase = createServerClient();
  const { data: rows, error } = await supabase
    .from("user_review_responses")
    .select("rating, reviewed_at, topic_review_questions(difficulty)")
    .eq("user_id", userId)
    .eq("topic_slug", topicSlug)
    .order("reviewed_at", { ascending: false })
    .limit(12);

  if (error && isMissingTableError(error)) {
    throw new Error("MISSING_REVIEW_TABLES");
  }

  const history = (rows ?? []) as UserReviewResponseRow[];
  const hasHistory = history.length > 0;
  const lastReviewedAt = history[0]?.reviewed_at ?? null;
  const daysSinceLastReview = lastReviewedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(lastReviewedAt).getTime()) / MS_PER_DAY))
    : 0;

  const lastSessionRatings = history.reduce(
    (acc, item) => {
      acc[item.rating] += 1;
      return acc;
    },
    { got_it: 0, almost: 0, didnt_get_it: 0 }
  );

  const struggledDifficulty =
    hasHistory
      ? history.find((item) => item.rating === "didnt_get_it")?.topic_review_questions?.difficulty ??
        history.find((item) => item.rating === "almost")?.topic_review_questions?.difficulty ??
        history[0]?.topic_review_questions?.difficulty ??
        null
      : null;

  const warmupMessage = await generateWarmupNote(subtopicName, parentTopicName, daysSinceLastReview, hasHistory);

  return {
    parentTopicName,
    lastReviewedLabel: formatLastReviewedLabel(daysSinceLastReview, hasHistory),
    lastSessionRatings: hasHistory ? lastSessionRatings : null,
    warmupMessage,
    struggledDifficulty,
  };
}

export default async function ReviewPage({ params }: { params: { slug: string } }) {
  const lookup = findSubtopicBySlug(params.slug);
  if (!lookup) {
    notFound();
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const [questions, briefing] = await Promise.all([
      getOrCreateReviewQuestions(lookup.subtopic.slug, lookup.subtopic.displayName, lookup.parentTopic.displayName),
      getBriefingData(user.id, lookup.subtopic.slug, lookup.subtopic.displayName, lookup.parentTopic.displayName),
    ]);

    return (
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
        <ReviewSessionClient
          topicSlug={lookup.subtopic.slug}
          topicName={lookup.subtopic.displayName}
          questions={questions}
          briefing={briefing}
        />
      </div>
    );
  } catch (error) {
    const isMissingTables = error instanceof Error && error.message === "MISSING_REVIEW_TABLES";
    if (!isMissingTables) {
      throw error;
    }

    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Review setup required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>The review tables are missing in Supabase, so this review session can&apos;t start yet.</p>
            <p>Please run the provided review migrations in your Supabase dashboard, then refresh this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
