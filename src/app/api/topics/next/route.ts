export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { computeMasteryForAllTopics } from "@/lib/learning/mastery";
import { findNextTopic, type TopicMasteryInfo } from "@/lib/learning/nextTopic";
import { getPrerequisiteSlugs } from "@/data/prerequisites";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = { findMany(args?: Record<string, unknown>): Promise<DbRecord[]> };
type PrismaLikeClient = { topic: DbModelDelegate };
const dbClient = db as unknown as PrismaLikeClient;

type TopicRecord = {
  id: string;
  slug: string;
  name: string;
};

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

  const topics = await dbClient.topic.findMany({
    select: { id: true, slug: true, name: true },
  }) as TopicRecord[];

  const slugToName = new Map(topics.map((t) => [t.slug, t.name]));

  const masteryBySlug = await computeMasteryForAllTopics(dbUser.id);

  const masteryInfo: TopicMasteryInfo[] = Object.entries(masteryBySlug).map(
    ([slug, m]) => ({
      slug,
      masteryPercentage: m.masteryPercentage,
      band: m.band,
    })
  );

  // Also include slugs with no data
  const allSlugs = topics.map((t) => t.slug);
  const seenSlugs = new Set(masteryInfo.map((m) => m.slug));
  for (const slug of allSlugs) {
    if (!seenSlugs.has(slug)) {
      masteryInfo.push({ slug, masteryPercentage: 0, band: "none" });
      seenSlugs.add(slug);
    }
  }

  const next = findNextTopic(allSlugs, masteryInfo);

  if (!next) {
    return NextResponse.json({ next: null });
  }

  const name = slugToName.get(next.slug);
  if (!name) {
    return NextResponse.json({ next: null });
  }

  const prereqs = getPrerequisiteSlugs(next.slug);
  const prereqNames = prereqs
    .map((s) => slugToName.get(s))
    .filter(Boolean) as string[];

  return NextResponse.json({
    next: {
      slug: next.slug,
      name,
      reason: next.reason,
      prerequisites: prereqNames,
    },
  });
}
