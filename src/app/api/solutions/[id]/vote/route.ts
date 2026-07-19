import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { voteSolution } from "@/lib/solutions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

    const body = await req.json();
    const { vote } = body;

    if (!vote || !["UP", "DOWN"].includes(vote)) {
      return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
    }

    const result = await voteSolution(dbUser.id, params.id, vote);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to vote" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error voting on solution:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
