import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { topicTaxonomy } from "@/lib/topic-taxonomy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReviewResponseRow = {
  topic_slug: string;
  rating: "got_it" | "almost" | "didnt_get_it";
  reviewed_at: string;
  topic_review_questions: { difficulty: "beginner" | "intermediate" | "advanced" } | null;
};

type GapCardData = {
  slug: string;
  name: string;
  difficulty: string;
  lastReviewed: string | null;
  didntCount: number;
  almostCount: number;
};

const topicNameBySlug = topicTaxonomy.flatMap((topic) => topic.subtopics).reduce(
  (acc, subtopic) => {
    acc[subtopic.slug] = subtopic.displayName;
    return acc;
  },
  {} as Record<string, string>
);

function formatLastReviewed(dateIso: string | null) {
  if (!dateIso) {
    return "Not yet reviewed";
  }
  return new Date(dateIso).toLocaleDateString();
}

export default async function KnowledgeGapsPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: responses, error } = await supabase
    .from("user_review_responses")
    .select("topic_slug, rating, reviewed_at, topic_review_questions(difficulty)")
    .eq("user_id", user.id)
    .order("reviewed_at", { ascending: false });

  if (error) {
    console.warn("Failed to load user review responses", error);
  }

  const grouped = ((responses ?? []) as ReviewResponseRow[]).reduce(
    (acc, row) => {
      if (!acc[row.topic_slug]) {
        acc[row.topic_slug] = {
          slug: row.topic_slug,
          name: topicNameBySlug[row.topic_slug] ?? row.topic_slug,
          difficulty: row.topic_review_questions?.difficulty ?? "beginner",
          lastReviewed: row.reviewed_at,
          didntCount: 0,
          almostCount: 0,
        };
      }

      const item = acc[row.topic_slug];
      if (!item.lastReviewed || new Date(row.reviewed_at) > new Date(item.lastReviewed)) {
        item.lastReviewed = row.reviewed_at;
      }

      if (row.rating === "didnt_get_it") {
        item.didntCount += 1;
      }
      if (row.rating === "almost") {
        item.almostCount += 1;
      }
      if (row.topic_review_questions?.difficulty) {
        item.difficulty = row.topic_review_questions.difficulty;
      }
      return acc;
    },
    {} as Record<string, GapCardData>
  );

  const allSubtopics = topicTaxonomy.flatMap((topic) => topic.subtopics);
  const reviewedSlugs = new Set(Object.keys(grouped));

  const didntGetItTopics = Object.values(grouped)
    .filter((topic) => topic.didntCount > 0)
    .sort((a, b) => b.didntCount - a.didntCount);

  const almostTopics = Object.values(grouped)
    .filter((topic) => topic.almostCount > 0 && topic.didntCount === 0)
    .sort((a, b) => b.almostCount - a.almostCount);

  const notYetReviewed = allSubtopics
    .filter((subtopic) => !reviewedSlugs.has(subtopic.slug))
    .map((subtopic) => ({
      slug: subtopic.slug,
      name: subtopic.displayName,
      difficulty: "—",
      lastReviewed: null,
    }));

  const renderCard = (topic: { slug: string; name: string; difficulty: string; lastReviewed: string | null }) => (
    <Card key={topic.slug}>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">{topic.name}</p>
          <p className="text-sm text-muted-foreground">
            Difficulty tier: <span className="capitalize">{topic.difficulty}</span>
          </p>
          <p className="text-xs text-muted-foreground">Last reviewed: {formatLastReviewed(topic.lastReviewed)}</p>
        </div>
        <Link href={`/review/${topic.slug}`}>
          <Button size="sm">Review Again</Button>
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Knowledge Gaps</h1>
        <p className="text-muted-foreground">Topics where you need the most practice.</p>
      </div>

      <section className="space-y-3">
        <CardHeader className="px-0">
          <CardTitle>Didn&apos;t get it (most frequent)</CardTitle>
          <CardDescription>Topics where you most often rated “Didn&apos;t get it”.</CardDescription>
        </CardHeader>
        {didntGetItTopics.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">No major struggle topics yet.</CardContent>
          </Card>
        ) : (
          didntGetItTopics.map(renderCard)
        )}
      </section>

      <section className="space-y-3">
        <CardHeader className="px-0">
          <CardTitle>Almost</CardTitle>
          <CardDescription>Topics where you&apos;re close but need reinforcement.</CardDescription>
        </CardHeader>
        {almostTopics.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">No “Almost” topics right now.</CardContent>
          </Card>
        ) : (
          almostTopics.map(renderCard)
        )}
      </section>

      <section className="space-y-3">
        <CardHeader className="px-0">
          <CardTitle>Not yet reviewed</CardTitle>
          <CardDescription>Topics with no review activity yet.</CardDescription>
        </CardHeader>
        {notYetReviewed.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">You&apos;ve reviewed every topic at least once.</CardContent>
          </Card>
        ) : (
          notYetReviewed.map(renderCard)
        )}
      </section>
    </div>
  );
}
