import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

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

    const dueProblems = await prisma.userProblem.findMany({
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
    });

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
