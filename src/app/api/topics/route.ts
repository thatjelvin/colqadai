export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { computeMasteryForAllTopics } from "@/lib/learning/mastery";

/** Typed database client cast for the in-memory DB proxy. */
type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};

type TopicRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  parentId: string | null;
  problems: Array<{ id: string }>;
  children: Array<{
    id: string;
    slug: string;
    name: string;
    order: number;
    problems: Array<{ id: string }>;
  }>;
};

type PrismaLikeClient = {
  topic: DbModelDelegate;
};

const dbClient = db as unknown as PrismaLikeClient;

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
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
    }) as unknown as TopicRecord[];

    const masteryBySlug = await computeMasteryForAllTopics(userId);

    const topicsWithProgress = topics.map((topic) => {
      const allProblems = [
        ...topic.problems,
        ...topic.children.flatMap((c) => c.problems),
      ];

      const totalCount = allProblems.length;
      const ownMastery = masteryBySlug[topic.slug];
      const childMasteries = topic.children
        .map((child) => masteryBySlug[child.slug])
        .filter(Boolean);

      const allMasteries = [ownMastery, ...childMasteries].filter(Boolean);
      const avgMastery = allMasteries.length > 0
        ? Math.round(
            allMasteries.reduce((sum, m) => sum + m.masteryPercentage, 0) / allMasteries.length,
          )
        : 0;

      const attempted = allMasteries.reduce(
        (sum, m) => sum + (m?.attemptedProblems ?? 0),
        0,
      );

      return {
        ...topic,
        progress: {
          mastered: attempted,
          total: totalCount,
          percentage: avgMastery,
        },
      };
    });

    return NextResponse.json(topicsWithProgress);
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}