export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { topicTaxonomy } from "@/lib/topic-taxonomy";
import { TopicExplorerClient } from "@/components/explore/TopicExplorerClient";
import { AppHamburgerDrawer } from "@/components/navigation/AppHamburgerDrawer";
import { getUserTopicProgressBySlug } from "@/lib/topic-progress";

export default async function ExplorePage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const progressBySlug = await getUserTopicProgressBySlug(user.id);

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
