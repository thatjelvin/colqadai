export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import {
  ReviewSessionClient,
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

Also search for 1-2 real past exam or textbook questions on this topic from universities or well-known sources (MIT OpenCourseWare, Khan Academy, past papers) and include them in the advanced tier with a note indicating the source.

Return only valid JSON. No markdown. No preamble.`,
    },
  ] as const;

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
    await supabase.from("topic_review_questions").delete().eq("topic_slug", topicSlug);
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
    throw new Error(`Failed to store review questions: ${insertError.message}`);
  }

  const { data: storedRows, error: fetchStoredError } = await supabase
    .from("topic_review_questions")
    .select("id, difficulty, question, solution, hint, source, created_at")
    .eq("topic_slug", topicSlug);

  if (fetchStoredError) {
    throw new Error(`Failed to read stored review questions: ${fetchStoredError.message}`);
  }

  return orderQuestions((storedRows ?? []) as TopicReviewQuestionRow[]);
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

  const questions = await getOrCreateReviewQuestions(
    lookup.subtopic.slug,
    lookup.subtopic.displayName,
    lookup.parentTopic.displayName
  );

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <ReviewSessionClient
        topicSlug={lookup.subtopic.slug}
        topicName={lookup.subtopic.displayName}
        questions={questions}
      />
    </div>
  );
}
