import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { db } from "@/lib/db";
import { computeMasteryForAllTopics } from "@/lib/learning/mastery";
import { TopicGridClient } from "@/components/TopicGridClient";

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
        <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
        <p className="text-muted-foreground">
          Browse the math curriculum. Your mastery is calculated from real review performance.
        </p>
      </div>

      <TopicGridClient topics={topicsForGrid} />
    </div>
  );
}
