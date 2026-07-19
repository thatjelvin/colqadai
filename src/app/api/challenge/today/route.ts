export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { selectProblemOfTheDay } from "@/lib/challenge";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;
    const userPlan = dbUser.plan;

    const challenge = await selectProblemOfTheDay(userId, userPlan);

    return NextResponse.json({
      problemId: challenge.problemId,
      problemBody: challenge.problemBody,
      alreadyCompleted: challenge.alreadyCompleted,
    });
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
    return NextResponse.json(
      { error: "Failed to load daily challenge" },
      { status: 500 }
    );
  }
}
