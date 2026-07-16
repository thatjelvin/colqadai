import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { addConceptForReview } from "@/lib/learning/conceptReview";

export const dynamic = "force-dynamic";

/**
 * Record concepts from a chat session for spaced repetition review.
 * Expects a JSON body with:
 *   {
 *     "concepts": string[] // Array of concept strings
 *   }
 *
 * For each concept, it will be added to the user's concept review queue
 * with an initial assumption that the user understood it well during the chat.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email || "", user.user_metadata?.full_name ?? null, user.user_metadata?.avatar_url ?? null);
    const userId = dbUser.id;

    const body = await request.json();
    const { concepts } = body;

    if (!Array.isArray(concepts)) {
      return NextResponse.json(
        { error: "Expected a 'concepts' array in the request body" },
        { status: 400 }
      );
    }

    // Process each concept
    for (const concept of concepts) {
      if (typeof concept !== "string" || concept.trim() === "") {
        continue; // Skip invalid concepts
      }
      // We assume the user has a good grasp of the concept after discussing it in chat.
      // In a real system, we might want to assess their understanding, but for now we'll mark as correct.
      await addConceptForReview(userId, concept.trim(), true, 4); // quality 4 = good
    }

    return NextResponse.json({ success: true, processed: concepts.length });
  } catch (error) {
    console.error("Error recording concepts for review:", error);
    return NextResponse.json(
      { error: "Failed to process concepts" },
      { status: 500 }
    );
  }
}