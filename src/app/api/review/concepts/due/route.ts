export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { getDueConceptReviews } from "@/lib/learning/conceptReview";
import { db } from "@/lib/db";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
};
type PrismaLikeClient = { conceptReview: DbModelDelegate };
const dbClient = db as unknown as PrismaLikeClient;

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

    const dueItems = await getDueConceptReviews(dbUser.id);

    // Enrich with topic info if available
    const enriched = await Promise.all(
      dueItems.map(async (item: DbRecord) => {
        const full = await dbClient.conceptReview.findFirst({
          where: { id: item.id },
          select: {
            id: true,
            concept: true,
            nextReviewAt: true,
            repetitionCount: true,
            efFactor: true,
          },
        }) as DbRecord | null;

        return {
          id: item.id,
          concept: item.concept,
          nextReviewAt: (full?.nextReviewAt instanceof Date ? full.nextReviewAt.toISOString() : new Date().toISOString()),
          repetitions: (full?.repetitionCount as number) ?? 0,
          easeFactor: (full?.efFactor as number) ?? 2.5,
        };
      })
    );

    return NextResponse.json({ items: enriched });
  } catch (error) {
    console.error("Error fetching due concepts:", error);
    return NextResponse.json({ items: [], error: "Failed to load" }, { status: 500 });
  }
}
