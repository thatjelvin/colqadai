export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import {
  buildSummaryPrompt,
  parseStoredSummary,
  type ChapterSummary,
} from "@/lib/learning/summary-schema";
import { ChapterSummaryClient } from "@/components/explore/ChapterSummaryClient";
import { groq } from "@/lib/groq";

const keyConceptActionSchema = z.object({
  name: z.string().min(1),
  explanation: z.string().min(1),
  example: z.string().min(1),
});

const keyConceptListSchema = z.array(keyConceptActionSchema).min(1);

type TopicSummaryRow = {
  summary_data: unknown;
};

async function generateSummaryWithGroq(
  subtopicName: string,
  parentTopicName: string
): Promise<ChapterSummary> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a university math tutor. Return only valid JSON. No markdown. No preamble. No explanation outside the JSON object.",
        },
        {
          role: "user",
          content: buildSummaryPrompt(subtopicName, parentTopicName),
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
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
    return parseStoredSummary(parsed) ?? (() => {
      throw new Error("Generated summary did not match expected schema");
    })();
  } catch (error) {
    console.error("Failed to generate summary with Groq:", error);
    return {
      overview: "Summary unavailable. Please try again later.",
      prerequisites: [],
      definitions: [],
      theorems: [],
      derivations: [],
      examples: [],
      common_mistakes: [],
      formula_summary: [],
    };
  }
}

async function getOrBuildSummaryForSlug(
  slug: string,
  subtopicName: string,
  parentSlug: string,
  parentTopicName: string
): Promise<ChapterSummary> {
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
    const validated = parseStoredSummary((cachedSummaryRow as TopicSummaryRow).summary_data);
    if (validated) {
      return validated;
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

async function startReviewAction(formData: FormData): Promise<void> {
  "use server";

  const slug = formData.get("slug");
  const keyConceptsRaw = formData.get("keyConcepts");

  if (typeof slug !== "string" || typeof keyConceptsRaw !== "string") {
    throw new Error("Invalid form submission payload");
  }

  const lookup = findSubtopicBySlug(slug);
  if (!lookup) {
    throw new Error("Unknown topic slug");
  }

  let parsedConcepts: z.infer<typeof keyConceptListSchema>;
  try {
    parsedConcepts = keyConceptListSchema.parse(JSON.parse(keyConceptsRaw));
  } catch {
    throw new Error("Invalid key concepts payload");
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email);
  const now = new Date();

  let parentTopic = await db.topic.findFirst({
    where: {
      slug: lookup.parentTopic.slug,
      parentId: null,
    },
  });

  if (!parentTopic) {
    parentTopic = await db.topic.create({
      data: {
        name: lookup.parentTopic.displayName,
        slug: lookup.parentTopic.slug,
        description: `Auto-generated parent topic for ${lookup.parentTopic.displayName}`,
        order: 0,
      },
    });
  }

  let subtopicTopic = await db.topic.findFirst({
    where: {
      slug: lookup.subtopic.slug,
    },
  });

  if (!subtopicTopic) {
    subtopicTopic = await db.topic.create({
      data: {
        name: lookup.subtopic.displayName,
        slug: lookup.subtopic.slug,
        description: `Auto-generated topic for ${lookup.subtopic.displayName}`,
        parentId: parentTopic.id,
        order: 0,
      },
    });
  }

  for (const concept of parsedConcepts) {
    let problem = await db.problem.findFirst({
      where: {
        topicId: subtopicTopic.id,
        title: concept.name,
      },
    });

    if (!problem) {
      problem = await db.problem.create({
        data: {
          topicId: subtopicTopic.id,
          title: concept.name,
          body: `Recall and explain this concept: ${concept.name}`,
          solution: `${concept.explanation}\n\nWorked example:\n${concept.example}`,
          topicTag: slug,
          difficulty: "MEDIUM",
        },
      });
    }

    await db.userProblem.upsert({
      where: {
        userId_problemId: {
          userId: dbUser.id,
          problemId: problem.id,
        },
      },
      create: {
        userId: dbUser.id,
        problemId: problem.id,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewAt: now,
        status: "LEARNING",
      },
      update: {
        nextReviewAt: now,
      },
    });
  }

  const { data: currentProgress } = await supabase
    .from("user_topic_progress")
    .select("first_explored_at")
    .eq("user_id", user.id)
    .eq("topic_slug", slug)
    .maybeSingle();

  const { error: progressError } = await supabase.from("user_topic_progress").upsert(
    {
      user_id: user.id,
      topic_slug: slug,
      first_explored_at: currentProgress?.first_explored_at ?? now.toISOString(),
    },
    {
      onConflict: "user_id,topic_slug",
      ignoreDuplicates: true,
    }
  );

  if (progressError) {
    console.warn("Failed to mark topic explored for review", progressError);
  }

  redirect(`/review/${slug}`);
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

  const keyConceptsForAction = summary.definitions.map((d) => ({
    name: d.name,
    explanation: d.explanation,
    example: d.example ?? "",
  }));

  return (
    <ChapterSummaryClient
      parentTopicDisplayName={lookup.parentTopic.displayName}
      subtopicDisplayName={lookup.subtopic.displayName}
      subtopicSlug={lookup.subtopic.slug}
      summary={summary}
      startReviewAction={startReviewAction}
      keyConceptsForAction={keyConceptsForAction}
    />
  );
}
