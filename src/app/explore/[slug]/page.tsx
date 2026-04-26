export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import { createServerClient } from "@/lib/supabase/server";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";

const summarySectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(["definition", "theorem", "example", "explanation"]),
});

const keyFormulaSchema = z.object({
  label: z.string().min(1),
  latex: z.string().min(1),
});

const topicSummarySchema = z.object({
  summary: z.string().min(1),
  prerequisites: z.array(z.string().min(1)).min(2).max(4),
  sections: z.array(summarySectionSchema).min(5),
  key_formulas: z.array(keyFormulaSchema).min(1),
  common_mistakes: z.array(z.string().min(1)).min(2).max(3),
  practice_tip: z.string().min(1),
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
            "You are a university mathematics textbook author. Generate a structured topic summary in JSON. Use LaTeX notation for all mathematical expressions (e.g. \\\\langle u, v \\\\rangle, \\\\|u\\|, \\\\in, \\\\sum, \\\\int). Return only valid JSON. No markdown. No preamble.",
        },
        {
          role: "user",
          content: `Generate a detailed university-level summary for the topic "${subtopicName}" which is part of "${parentTopicName}".

Return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence plain-English overview of what this topic is and why it matters",
  "prerequisites": ["2-4 topic names the student should know first"],
  "sections": [
    {
      "title": "section title (e.g. 'Formal Definition', 'Key Properties', 'Worked Examples')",
      "content": "full explanatory text for this section. Use LaTeX for all math. For worked examples, show full step-by-step reasoning labelled Step 1, Step 2, etc. Include the reasoning behind each step.",
      "type": "definition | theorem | example | explanation"
    }
  ],
  "key_formulas": [
    {
      "label": "formula name (e.g. 'Cauchy-Schwarz Inequality')",
      "latex": "LaTeX string of the formula"
    }
  ],
  "common_mistakes": ["2-3 common errors students make"],
  "practice_tip": "one actionable study tip"
}

Structure the sections as follows, in order:
1. Concept Explanation — formal definition, then intuitive explanation, then why it matters
2. Key Properties & Theorems — list each property with a name, statement, and brief explanation
3. Worked Example (Basic) — a simple numerical example with full step-by-step solution and reasoning
4. Worked Example (Intermediate) — a moderately complex example with full step-by-step solution and reasoning
5. Worked Example (Advanced) — a more complex or abstract example with full step-by-step solution and reasoning

Keep language accessible to a first or second year university student. Be thorough — this is a learning reference, not a quick summary.`,
        },
      ],
      response_format: { type: "json_object" },
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
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link href="/topics" className="text-primary hover:underline">
            Topics
          </Link>{" "}
          / {lookup.parentTopic.displayName}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{lookup.subtopic.displayName}</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <MathRenderer content={summary.summary} className="text-sm text-foreground sm:text-base" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prerequisites</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {summary.prerequisites.map((item) => (
              <Badge key={item} variant="secondary" className="py-1">
                <MathRenderer content={item} className="text-xs leading-5" />
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Key Formulas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.key_formulas.map((formula) => (
              <div key={formula.label} className="rounded-md border bg-background p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">{formula.label}</p>
                <MathRenderer content={`$$${formula.latex}$$`} className="text-sm text-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {summary.sections.map((section) => {
            const isExample = section.type === "example";
            return (
              <Card
                key={`${section.title}-${section.type}`}
                className={isExample ? "border-blue-200 bg-blue-50/60" : ""}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <MathRenderer content={section.content} className="text-sm text-foreground sm:text-base" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Common Mistakes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
              {summary.common_mistakes.map((mistake) => (
                <li key={mistake}>
                  <MathRenderer content={mistake} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle>Practice Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <MathRenderer content={summary.practice_tip} className="text-sm text-foreground sm:text-base" />
          </CardContent>
        </Card>

        <Link href={`/review/${lookup.subtopic.slug}`}>
          <Button size="lg" className="h-12 w-full text-base font-semibold sm:w-auto sm:min-w-56">
            Start Review
          </Button>
        </Link>
      </div>
    </div>
  );
}
