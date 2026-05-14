export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import { ChapterSummaryClient } from "@/components/explore/ChapterSummaryClient";
import { MAX_SUMMARY_CHAPTERS, MIN_SUMMARY_CHAPTERS } from "@/lib/review-metrics";

const numberedStatementSchema = z.object({
  number_label: z.string().min(1),
  title: z.string().min(1),
  statement: z.string().min(1),
  formula_latex: z.string().min(1).optional(),
});

const workedExampleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const topicSummarySchema = z.object({
  chapters: z
    .array(
      z.object({
        chapter_number: z.number().int().min(1),
        title: z.string().min(1),
        content: z.object({
          short_intro: z.string().min(1),
          definitions: z.array(numberedStatementSchema).min(1),
          transition_prose: z.string().min(1),
          theorems: z.array(numberedStatementSchema).min(1),
          remarks: z.array(z.string().min(1)).default([]),
          worked_examples: z.array(workedExampleSchema).min(1),
        }),
      })
    )
    .min(MIN_SUMMARY_CHAPTERS)
    .max(MAX_SUMMARY_CHAPTERS),
  summary: z.object({
    overview: z.string().min(1),
  }),
  prerequisites: z.array(z.string().min(1)).min(2).max(4),
});

type TopicSummaryRow = {
  summary_data: unknown;
};

async function generateSummaryWithGroq(subtopicName: string, parentTopicName: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a university mathematics textbook author. Generate a structured chapter-based summary in JSON with rigorous notation. Use LaTeX notation for all mathematical expressions. Return only valid JSON. No markdown.",
        },
        {
          role: "user",
          content: `Generate a university-level summary for "${subtopicName}" (part of "${parentTopicName}").

Return exactly this JSON structure:
{
  "chapters": [
    {
      "chapter_number": 1,
      "title": "chapter title",
      "content": {
        "short_intro": "short prose paragraph introducing the chapter",
        "definitions": [
          {
            "number_label": "4.13",
            "title": "definition title",
            "statement": "formal definition in prose with inline LaTeX if needed",
            "formula_latex": "optional block formula in LaTeX (without $$)"
          }
        ],
        "transition_prose": "short prose paragraph connecting definitions to theorems",
        "theorems": [
          {
            "number_label": "4.14",
            "title": "theorem title",
            "statement": "formal theorem statement in prose with inline LaTeX if needed",
            "formula_latex": "optional block formula in LaTeX (without $$)"
          }
        ],
        "remarks": ["short remark tied to theorem meaning, assumptions, or interpretation"],
        "worked_examples": [{ "title": "example title", "content": "worked solution with steps and LaTeX where needed" }]
      }
    }
  ],
  "summary": {
    "overview": "2-3 sentence intro paragraph for the whole topic"
  },
  "prerequisites": ["2-4 prerequisite topic names"]
}

Requirements:
- Produce 2-3 chapters.
- For each chapter, keep this exact order in content flow:
  short intro -> definitions -> transition prose -> theorems -> remarks -> worked examples.
- Definitions must be formal and numbered (e.g., 4.13) and written as prose, never bullets.
- Theorems must be formal and numbered (e.g., 4.14) and written as prose, never bullets.
- Remarks must be concise theorem-adjacent comments.
- Any formulas that should be displayed on separate lines must be placed in formula_latex.
- Include at least one worked example in each chapter.
- Keep explanations concise, rigorous, and practical for university STEM students.
- Keep output valid JSON only.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${payload}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  if (typeof rawContent !== "string") {
    throw new Error("Groq did not return message content");
  }

  const cleaned = rawContent
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return topicSummarySchema.parse(parsed);
}

async function getOrBuildSummaryForSlug(slug: string, subtopicName: string, parentSlug: string, parentTopicName: string) {
  const supabase = createServerClient();

  const { data: cachedSummaryRow, error: summaryFetchError } = await supabase
    .from("topic_summaries")
    .select("summary_data")
    .eq("topic_slug", slug)
    .maybeSingle();

  if (summaryFetchError) {
    console.warn("Failed to fetch cached topic summary", summaryFetchError);
  }

  if (cachedSummaryRow) {
    const validated = topicSummarySchema.safeParse((cachedSummaryRow as TopicSummaryRow).summary_data);
    if (validated.success) {
      return validated.data;
    }
  }

  const generatedSummary = await generateSummaryWithGroq(subtopicName, parentTopicName);

  const { error: cacheError } = await supabase.from("topic_summaries").upsert(
    {
      topic_slug: slug,
      parent_slug: parentSlug,
      summary_data: generatedSummary,
    },
    { onConflict: "topic_slug" }
  );

  if (cacheError) {
    console.warn("Failed to cache topic summary", cacheError);
  }

  return generatedSummary;
}

async function markTopicExplored(slug: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_topic_progress").upsert(
    {
      user_id: user.id,
      topic_slug: slug,
      first_explored_at: now,
    },
    {
      onConflict: "user_id,topic_slug",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    console.warn("Failed to mark topic explored", error);
  }
}

export default async function TopicSummaryPage({ params }: { params: { slug: string } }) {
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

  const summary = await getOrBuildSummaryForSlug(
    lookup.subtopic.slug,
    lookup.subtopic.displayName,
    lookup.parentTopic.slug,
    lookup.parentTopic.displayName
  );

  await markTopicExplored(lookup.subtopic.slug);

  return (
    <ChapterSummaryClient
      topicSlug={lookup.subtopic.slug}
      topicName={lookup.subtopic.displayName}
      parentTopicName={lookup.parentTopic.displayName}
      prerequisites={summary.prerequisites}
      summaryOverview={summary.summary.overview}
      chapters={summary.chapters}
    />
  );
}
