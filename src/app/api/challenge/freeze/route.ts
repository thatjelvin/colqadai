export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { useStreakFreeze, hasUnusedFreeze } from "@/lib/challenge";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;

    const available = await hasUnusedFreeze(userId);

    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error checking streak freeze:", error);
    return NextResponse.json(
      { available: false, error: "Failed to check streak freeze" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    const userId = dbUser.id;

    // Only PRO and MAX users can use streak freezes
    if (dbUser.plan === "FREE") {
      return NextResponse.json(
        { success: false, message: "Streak freeze is a PRO feature" },
        { status: 403 }
      );
    }

    const result = await useStreakFreeze(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error activating streak freeze:", error);
    return NextResponse.json(
      { success: false, message: "Failed to activate streak freeze" },
      { status: 500 }
    );
  }
}
