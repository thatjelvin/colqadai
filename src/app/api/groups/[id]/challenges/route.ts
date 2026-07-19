export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { getGroupChallenges, createChallenge } from "@/lib/groups";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

    const challenges = await getGroupChallenges(params.id, dbUser.id);
    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ challenges: [], error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

    const body = await req.json();
    const { title, description, topicSlugs, problemCount, dueBy } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const result = await createChallenge(
      dbUser.id,
      params.id,
      title,
      description,
      topicSlugs,
      problemCount,
      dueBy
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}
