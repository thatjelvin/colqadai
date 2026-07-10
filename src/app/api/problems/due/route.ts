export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

type UserProblemRecord = {
  nextReviewAt: Date | string;
  problem: {
    id: string;
    title: string;
    topicTag: string | null;
    topic: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};
type PrismaLikeClient = {
  userProblem: DbModelDelegate;
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

    const now = new Date();

    const dueProblems = await dbClient.userProblem.findMany({
      where: {
        userId,
        nextReviewAt: {
          lte: now,
        },
      },
      include: {
        problem: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: {
        nextReviewAt: "asc",
      },
      take: 10,
    }) as UserProblemRecord[];

    const withUrgency = dueProblems.map((item) => {
      const overdueDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(item.nextReviewAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        ...item,
        urgencyScore: 1 + overdueDays,
      };
    });

    return NextResponse.json(withUrgency);
  } catch (error) {
    console.error("Error fetching due problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch due problems" },
      { status: 500 }
    );
  }
}
