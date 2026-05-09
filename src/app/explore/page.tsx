export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { topicTaxonomy } from "@/lib/topic-taxonomy";
import { TopicExplorerClient } from "@/components/explore/TopicExplorerClient";
import { AppHamburgerDrawer } from "@/components/navigation/AppHamburgerDrawer";

type UserTopicProgressRow = {
  topic_slug: string;
  review_count: number | null;
  mastery_percent: number | null;
};

export default async function ExplorePage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: progressRows, error } = await supabase
    .from("user_topic_progress")
    .select("topic_slug, review_count, mastery_percent")
    .eq("user_id", user.id);

  if (error) {
    console.warn("Failed to fetch topic progress", error);
  }

  const progressBySlug = ((progressRows ?? []) as UserTopicProgressRow[]).reduce(
    (acc, row) => {
      acc[row.topic_slug] = {
        reviewCount: row.review_count ?? 0,
        masteryPercent: row.mastery_percent ?? 0,
      };
      return acc;
    },
    {} as Record<string, { reviewCount: number; masteryPercent: number }>
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <AppHamburgerDrawer />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Topic Explorer</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Explore the math curriculum, jump into a subtopic, and track your progress.
        </p>
      </div>

      <TopicExplorerClient topics={topicTaxonomy} progressBySlug={progressBySlug} />
    </div>
  );
}
