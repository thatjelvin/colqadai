import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { db } from "@/lib/db";
import { computeMasteryForAllTopics } from "@/lib/learning/mastery";
import { findNextTopic, type TopicMasteryInfo } from "@/lib/learning/nextTopic";
import { MasteryTree } from "@/components/MasteryTree";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = { findMany(args?: Record<string, unknown>): Promise<DbRecord[]> };
type PrismaLikeClient = { topic: DbModelDelegate };
const dbClient = db as unknown as PrismaLikeClient;

type TopicRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  problems: Array<{ id: string }>;
  children: Array<{
    id: string;
    slug: string;
    name: string;
    problems: Array<{ id: string }>;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MasteryTreePage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

  const topics = await dbClient.topic.findMany({
    where: { parentId: null },
    include: {
      children: { include: { problems: true } },
      problems: true,
    },
    orderBy: { order: "asc" },
  }) as TopicRecord[];

  const masteryBySlug = await computeMasteryForAllTopics(dbUser.id);

  const slugToName = new Map<string, string>();
  for (const topic of topics) {
    slugToName.set(topic.slug, topic.name);
    for (const child of topic.children) {
      slugToName.set(child.slug, child.name);
    }
  }

  // Build mastery info array for findNextTopic
  const allSlugs = Array.from(slugToName.keys());
  const masteryInfo: TopicMasteryInfo[] = allSlugs.map((slug) => {
    const m = masteryBySlug[slug];
    return {
      slug,
      masteryPercentage: m?.masteryPercentage ?? 0,
      band: m?.band ?? "none",
    };
  });

  const next = findNextTopic(allSlugs, masteryInfo);

  let nextTopicData = null;
  if (next) {
    nextTopicData = {
      slug: next.slug,
      name: slugToName.get(next.slug) ?? next.slug,
      reason: next.reason,
    };
  }

  // Build tree structure with progress
  const treeTopics = topics.map((topic) => {
    const topicMastery = masteryBySlug[topic.slug];
    const childNodes = topic.children.map((child) => {
      const childMastery = masteryBySlug[child.slug];
      return {
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: null,
        children: [] as never[],
        progress: {
          mastered: childMastery?.totalProblems && childMastery.totalProblems > 0
            ? childMastery.masteryPercentage >= 100 ? childMastery.totalProblems : 0
            : 0,
          total: child.problems.length,
          percentage: childMastery?.masteryPercentage ?? 0,
        },
      };
    });

    const totalChildProblems = childNodes.reduce((sum, c) => sum + c.progress.total, 0);
    const totalMastered = childNodes.reduce((sum, c) => sum + c.progress.mastered, 0);

    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      children: childNodes,
      progress: {
        mastered: totalMastered,
        total: Math.max(totalChildProblems, topic.problems.length),
        percentage: topicMastery?.masteryPercentage ?? 0,
      },
    };
  });

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mastery Tree</h1>
        <p className="text-muted-foreground">
          View your progress across all topics. Master prerequisites to unlock new topics.
        </p>
      </div>

      <MasteryTree topics={treeTopics} nextTopic={nextTopicData} />
    </div>
  );
}
