export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import { ChapterSummaryClient } from "@/components/explore/ChapterSummaryClient";

const keyFormulaSchema = z.object({
  label: z.string().min(1),
  latex: z.string().min(1),
});

const chapterEntrySchema = z.object({
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
          conceptual_explanation: z.string().min(1),
          key_formulas: z.array(keyFormulaSchema).default([]),
          derivations: z.array(chapterEntrySchema).default([]),
          worked_examples: z.array(chapterEntrySchema).default([]),
          common_mistakes: z.array(z.string().min(1)).default([]),
        }),
      })
    )
    .min(2)
    .max(3),
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
            "You are a university mathematics textbook author. Generate a structured chapter-based summary in JSON. Use LaTeX notation for all mathematical expressions. Return only valid JSON. No markdown.",
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
        "conceptual_explanation": "clear conceptual explanation with intuition and significance",
        "key_formulas": [{ "label": "formula name", "latex": "formula in LaTeX" }],
        "derivations": [{ "title": "derivation title", "content": "step-by-step derivation" }],
        "worked_examples": [{ "title": "example title", "content": "worked solution with steps" }],
        "common_mistakes": ["common mistake 1", "common mistake 2"]
      }
    }
  ],
  "summary": {
    "overview": "2-3 sentence plain-English overview"
  },
  "prerequisites": ["2-4 prerequisite topic names"]
}

Requirements:
- Produce 2-3 chapters.
- Chapter 1: foundational definition and basic examples.
- Chapter 2: key theorems, derivations, and intermediate examples.
- Chapter 3 (only if needed): advanced applications and common pitfalls.
- Keep explanations concise, rigorous, and practical for university STEM students.
- Include at least one worked example in each chapter.
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
