import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { topicTaxonomy } from "@/lib/topic-taxonomy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReviewResponseRow = {
  topic_slug: string;
  rating: "got_it" | "almost" | "didnt_get_it";
};

type TopicProgressRow = {
  topic_slug: string;
  mastery_percent: number | null;
  next_review_due: string | null;
};

type GapTopic = {
  slug: string;
  topicName: string;
  parentTopicName: string;
  masteryPercent: number;
  nextReviewDue: string | null;
  gotRate: number;
  almostRate: number;
  didntRate: number;
  failureRate: number;
  struggleRate: number;
};

const topicMetaBySlug = topicTaxonomy.reduce(
  (acc, topic) => {
    topic.subtopics.forEach((subtopic) => {
      acc[subtopic.slug] = {
        topicName: subtopic.displayName,
        parentTopicName: topic.displayName,
      };
    });
    return acc;
  },
  {} as Record<string, { topicName: string; parentTopicName: string }>
);

function formatDate(dateIso: string | null) {
  if (!dateIso) {
    return "Not scheduled";
  }
  return new Date(dateIso).toLocaleDateString();
}

function rateToPercent(count: number, total: number) {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function GapSection({
  title,
  description,
  accent,
  topics,
}: {
  title: string;
  description: string;
  accent: string;
  topics: GapTopic[];
}) {
  return (
    <section className="space-y-3">
      <CardHeader className="px-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      {topics.length === 0 ? (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">No topics in this section yet.</CardContent>
        </Card>
      ) : (
        topics.map((topic) => (
          <Card key={topic.slug} className={`border-l-4 ${accent}`}>
            <CardContent className="space-y-3 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{topic.topicName}</p>
                  <p className="text-xs text-muted-foreground">{topic.parentTopicName}</p>
                </div>
                <Link href={`/review/${topic.slug}`}>
                  <Button size="sm">Review Again</Button>
                </Link>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <p>
                  Mastery: <span className="font-semibold">{topic.masteryPercent}%</span>
                </p>
                <p>
                  Next due: <span className="font-semibold">{formatDate(topic.nextReviewDue)}</span>
                </p>
                <p>
                  Failure rate: <span className="font-semibold">{topic.failureRate}%</span>
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                {topic.gotRate}% got it · {topic.almostRate}% almost · {topic.didntRate}% didn&apos;t get it
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}

export default async function KnowledgeGapsPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: responses, error: responsesError }, { data: progressRows, error: progressError }] = await Promise.all([
    supabase.from("user_review_responses").select("topic_slug, rating").eq("user_id", user.id),
    supabase.from("user_topic_progress").select("topic_slug, mastery_percent, next_review_due").eq("user_id", user.id),
  ]);

  if (responsesError) {
    console.warn("Failed to load user review responses", responsesError);
  }

  if (progressError) {
    console.warn("Failed to load user topic progress", progressError);
  }

  const progressBySlug = ((progressRows ?? []) as TopicProgressRow[]).reduce(
    (acc, row) => {
      acc[row.topic_slug] = {
        masteryPercent: row.mastery_percent ?? 0,
        nextReviewDue: row.next_review_due,
      };
      return acc;
    },
    {} as Record<string, { masteryPercent: number; nextReviewDue: string | null }>
  );

  const groupedCounts = ((responses ?? []) as ReviewResponseRow[]).reduce(
    (acc, row) => {
      if (!acc[row.topic_slug]) {
        acc[row.topic_slug] = {
          got_it: 0,
          almost: 0,
          didnt_get_it: 0,
          total: 0,
        };
      }

      acc[row.topic_slug][row.rating] += 1;
      acc[row.topic_slug].total += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        got_it: number;
        almost: number;
        didnt_get_it: number;
        total: number;
      }
    >
  );

  const topicsWithHistory: GapTopic[] = Object.entries(groupedCounts)
    .filter(([, counts]) => counts.total > 0)
    .map(([slug, counts]) => {
      const gotRate = rateToPercent(counts.got_it, counts.total);
      const almostRate = rateToPercent(counts.almost, counts.total);
      const didntRate = rateToPercent(counts.didnt_get_it, counts.total);
      const meta = topicMetaBySlug[slug] ?? { topicName: slug, parentTopicName: "Math" };
      const progress = progressBySlug[slug];

      return {
        slug,
        topicName: meta.topicName,
        parentTopicName: meta.parentTopicName,
        masteryPercent: progress?.masteryPercent ?? 0,
        nextReviewDue: progress?.nextReviewDue ?? null,
        gotRate,
        almostRate,
        didntRate,
        failureRate: didntRate,
        struggleRate: almostRate,
      };
    });

  const needsWork = topicsWithHistory
    .filter((topic) => topic.failureRate >= 40)
    .sort((a, b) => b.failureRate - a.failureRate);

  const gettingThere = topicsWithHistory
    .filter((topic) => topic.struggleRate >= 40 && topic.failureRate < 40)
    .sort((a, b) => b.struggleRate - a.struggleRate);

  const onTrack = topicsWithHistory
    .filter((topic) => topic.failureRate < 40 && topic.struggleRate < 40)
    .sort((a, b) => b.masteryPercent - a.masteryPercent);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <header className="space-y-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1 px-0">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Knowledge Gaps</h1>
        <p className="text-muted-foreground">Topics where you need the most practice.</p>
      </header>

      {topicsWithHistory.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Complete a review session to see your knowledge gaps.
          </CardContent>
        </Card>
      ) : (
        <>
          <GapSection
            title="Needs Work"
            description="Topics with high failure rates."
            accent="border-red-400"
            topics={needsWork}
          />
          <GapSection
            title="Getting There"
            description="Topics where you're close but need reinforcement."
            accent="border-amber-400"
            topics={gettingThere}
          />
          <GapSection
            title="On Track"
            description="Topics with solid performance and review history."
            accent="border-green-400"
            topics={onTrack}
          />
        </>
      )}
    </div>
  );
}
