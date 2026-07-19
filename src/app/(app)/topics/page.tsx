import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { db } from "@/lib/db";
import { computeMasteryForAllTopics } from "@/lib/learning/mastery";
import { TopicGridClient } from "@/components/TopicGridClient";
import { findNextTopic, type TopicMasteryInfo } from "@/lib/learning/nextTopic";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Trophy } from "lucide-react";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

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

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};
type PrismaLikeClient = {
  topic: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

export const dynamic = "force-dynamic";

type TopicGridItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subtopicCount: number;
  totalProblems: number;
  masteryPercentage: number;
  attempted: boolean;
  band: "none" | "novice" | "developing" | "proficient" | "mastered";
};

export default async function TopicsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const topics = await dbClient.topic.findMany({
    where: {
      parentId: null,
    },
    include: {
      children: {
        include: {
          problems: true,
        },
      },
      problems: true,
    },
    orderBy: {
      order: "asc",
    },
  }) as TopicRecord[];

  const masteryBySlug = await computeMasteryForAllTopics(userId);

  // Build next-topic recommendation
  const allSlugToName = new Map<string, string>();
  for (const topic of topics) {
    allSlugToName.set(topic.slug, topic.name);
    for (const child of topic.children) {
      allSlugToName.set(child.slug, child.name);
    }
  }
  const allSlugs = Array.from(allSlugToName.keys());
  const masteryInfo: TopicMasteryInfo[] = allSlugs.map((slug) => {
    const m = masteryBySlug[slug];
    return { slug, masteryPercentage: m?.masteryPercentage ?? 0, band: m?.band ?? "none" };
  });
  const nextRec = findNextTopic(allSlugs, masteryInfo);
  let nextTopicData: { slug: string; name: string; reason: string } | null = null;
  if (nextRec) {
    const name = allSlugToName.get(nextRec.slug);
    if (name) {
      nextTopicData = { slug: nextRec.slug, name, reason: nextRec.reason };
    }
  }

  const topicsForGrid: TopicGridItem[] = topics.map((topic) => {
    const allProblems = [
      ...topic.problems,
      ...topic.children.flatMap((c) => c.problems),
    ];
    const totalCount = allProblems.length;
    const mastery = masteryBySlug[topic.slug];
    return {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      description: topic.description,
      subtopicCount: topic.children.length,
      totalProblems: totalCount,
      masteryPercentage: mastery?.masteryPercentage ?? 0,
      attempted: (mastery?.attemptedProblems ?? 0) > 0,
      band: mastery?.band ?? "none",
    };
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
            <p className="text-muted-foreground">
              Browse the math curriculum. Your mastery is calculated from real review performance.
            </p>
          </div>
          <Link href="/topics/tree">
            <Button variant="outline" size="sm" className="gap-1.5">
              <GitBranch className="h-4 w-4" />
              Tree View
            </Button>
          </Link>
        </div>
      </div>

      {nextTopicData && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20">
          <CardContent className="py-3 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Next Recommended Topic</p>
                  <Link href={`/topics/${nextTopicData.slug}`} className="text-sm font-semibold hover:underline">
                    {nextTopicData.name}
                  </Link>
                  <span className="text-xs text-muted-foreground ml-2">{nextTopicData.reason}</span>
                </div>
              </div>
              <Link href={`/review/${nextTopicData.slug}`}>
                <Button size="sm" className="gap-1 shrink-0">
                  <Trophy className="h-4 w-4" />
                  Start
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <TopicGridClient topics={topicsForGrid} />
    </div>
  );
}
