export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { addConceptForReview } from "@/lib/learning/conceptReview";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

    const concept = decodeURIComponent(params.id);

    const body = await req.json();
    const { rating } = body;

    if (rating === undefined || rating === null || typeof rating !== "number") {
      return NextResponse.json({ error: "Rating is required (0-5)" }, { status: 400 });
    }

    const correct = rating >= 3;
    await addConceptForReview(dbUser.id, concept, correct, Math.round(rating));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reviewing concept:", error);
    return NextResponse.json({ error: "Failed to record review" }, { status: 500 });
  }
}
