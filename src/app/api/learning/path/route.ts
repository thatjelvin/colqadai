import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { createServerClient } from "@/lib/supabase/server";
import { generatePersonalizedLearningPath } from "@/lib/learning/personalizedLearningPath";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await getOrCreateUserForSupabaseId(
      user.id,
      user.email || "",
      user.user_metadata?.full_name ?? null,
      user.user_metadata?.avatar_url ?? null
    );

    const learningPath = await generatePersonalizedLearningPath(dbUser.id);

    return NextResponse.json(learningPath);
  } catch (error) {
    console.error("Failed to generate learning path:", error);
    return NextResponse.json(
      { error: "Failed to generate learning path" },
      { status: 500 }
    );
  }
}