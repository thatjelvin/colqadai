export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

const keyConceptSchema = z.object({
  name: z.string().min(1),
  explanation: z.string().min(1),
  example: z.string().min(1),
});

const topicSummarySchema = z.object({
  summary: z.string().min(1),
  prerequisites: z.array(z.string().min(1)).min(2).max(4),
  key_concepts: z.array(keyConceptSchema).min(4).max(6),
  common_mistakes: z.array(z.string().min(1)).min(2).max(3),
  practice_tip: z.string().min(1),
});

type TopicSummary = z.infer<typeof topicSummarySchema>;
type KeyConcept = z.infer<typeof keyConceptSchema>;

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
            "You are a university math tutor. Return only valid JSON. No markdown. No preamble. No explanation outside the JSON object.",
        },
        {
          role: "user",
          content: `Generate a structured learning summary for the subtopic "${subtopicName}" which is part of the parent topic "${parentTopicName}". Return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence plain-English overview of what this topic is and why it matters",
  "prerequisites": ["array of 2-4 topic names the student should know first"],
  "key_concepts": [
    {
      "name": "concept name",
      "explanation": "clear 2-3 sentence explanation",
      "example": "one concrete worked example or formula with a brief step-by-step walkthrough"
    }
  ],
  "common_mistakes": ["array of 2-3 common errors students make on this topic"],
  "practice_tip": "one actionable tip for studying this topic effectively"
}
Aim for 4-6 key concepts. Keep language accessible to a first or second year university student.`,
        },
      ],
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

async function startReviewAction(formData: FormData) {
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

  const parsedConcepts = z.array(keyConceptSchema).safeParse(JSON.parse(keyConceptsRaw));
  if (!parsedConcepts.success) {
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

  for (const concept of parsedConcepts.data) {
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
    .select("review_count")
    .eq("user_id", user.id)
    .eq("topic_slug", slug)
    .maybeSingle();

  const newReviewCount = (currentProgress?.review_count ?? 0) + 1;

  const { error: progressError } = await supabase.from("user_topic_progress").upsert(
    {
      user_id: user.id,
      topic_slug: slug,
      first_explored_at: now.toISOString(),
      review_count: newReviewCount,
    },
    {
      onConflict: "user_id,topic_slug",
    }
  );

  if (progressError) {
    console.warn("Failed to increment topic review count", progressError);
  }

  redirect("/study");
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
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 space-y-2">
        <Link href="/explore" className="text-sm text-primary hover:underline">
          Explore / {lookup.parentTopic.displayName}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{lookup.subtopic.displayName}</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-foreground sm:text-base">{summary.summary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prerequisites</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {summary.prerequisites.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Concepts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.key_concepts.map((concept: KeyConcept) => (
              <details key={concept.name} className="rounded-md border border-border px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium sm:text-base">
                  {concept.name}
                </summary>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground sm:text-base">
                  <p>{concept.explanation}</p>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="font-medium text-foreground">Worked example</p>
                    <p className="mt-1">{concept.example}</p>
                  </div>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common Mistakes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
              {summary.common_mistakes.map((mistake) => (
                <li key={mistake}>{mistake}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">{summary.practice_tip}</p>
          </CardContent>
        </Card>

        <form action={startReviewAction}>
          <input type="hidden" name="slug" value={lookup.subtopic.slug} />
          <input type="hidden" name="keyConcepts" value={JSON.stringify(summary.key_concepts)} />
          <Button size="lg" className="h-12 w-full text-base font-semibold sm:w-auto sm:min-w-56">
            Start Review
          </Button>
        </form>
      </div>
    </div>
  );
}
