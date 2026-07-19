export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { getLeaderboard } from "@/lib/challenge";

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    if (!dbUser) {
      return new Response("Unauthorized", { status: 401 });
    }

    const leaderboard = await getLeaderboard();

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { leaderboard: [], error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}
