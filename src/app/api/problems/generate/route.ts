import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { db } from "@/lib/db";
import { generateProblem } from "@/lib/learning/problemGenerator";

export const dynamic = "force-dynamic";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
};
const dbClient = db as unknown as { topic: DbModelDelegate; problem: DbModelDelegate };

/**
 * Generate a new math problem using AI and save it to the database.
 * Expects a JSON body with optional fields:
 *   - topicSlug: string (e.g., "differential-calculus")
 *   - difficulty: number (1-5)
 * If not provided, uses the user's recommended topic and difficulty from their profile.
 * Returns the generated problem's ID, problem statement, and solution.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { topicSlug, difficulty } = body;

    // Determine topic slug: from request, user profile, or default
    const finalTopicSlug = (topicSlug && topicSlug.trim())
      ? topicSlug.trim()
      : dbUser.recommendedTopic || "limits-continuity";

    // Determine difficulty: from request, user profile, or default (3 = medium)
    const finalDifficulty = difficulty !== undefined && !isNaN(difficulty)
      ? Math.max(1, Math.min(5, Number(difficulty))) // Clamp to 1-5
      : (dbUser.difficultyLevel ?? 3);

    // Look up the topic by slug to get its ID
    // We need to query the topic table; we assume it exists and has a slug field
    const topicRecord = await dbClient.topic.findFirst({
      where: { slug: finalTopicSlug },
      select: { id: true },
    }) as { id: string } | null;

    if (!topicRecord) {
      // If the topic doesn't exist, we cannot create a problem without a topicId.
      // Fallback: create a problem without a topic? But the problem model requires a topicId.
      // Instead, we'll use a default topic (first topic in the database) or return an error.
      // Let's try to get any topic as a fallback.
      const fallbackTopic = await dbClient.topic.findFirst({
        select: { id: true },
      }) as { id: string } | null;

      if (!fallbackTopic) {
        return NextResponse.json(
          { error: "No topics available in the database. Cannot generate problem." },
          { status: 500 }
        );
      }

      // Use the fallback topic's ID, but log a warning
      console.warn(`Topic "${finalTopicSlug}" not found, using fallback topic ID: ${fallbackTopic.id}`);
      return await generateAndSaveProblem(fallbackTopic.id, finalTopicSlug, finalDifficulty, user.id);
    }

    // If we found the topic, generate and save the problem
    return await generateAndSaveProblem(topicRecord.id, finalTopicSlug, finalDifficulty, user.id);
  } catch (error) {
    console.error("Error in problem generation endpoint:", error);
    return NextResponse.json(
      { error: "Failed to generate problem" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to generate a problem and save it to the database.
 */
async function generateAndSaveProblem(
  topicId: string,
  topicSlug: string,
  difficulty: number,
  userId: string
) {
  // Generate the problem using the LLM
  const { problem: problemStatement, solution } = await generateProblem(
    topicSlug,
    difficulty
  );

  // Create a new problem record in the database
  const newProblem = await dbClient.problem.create({
    data: {
      // We need to know the exact field names in the problem model.
      // From usage, we see:
      //   problem.body (string) - the problem statement
      //   problem.solution (string) - the solution
      //   problem.topicId (string) - foreign key to topic
      //   problem.id (string) - the primary key (uuid)
      body: problemStatement,
      solution,
      topic: {
        connect: {
          id: topicId,
        },
      },
      // Optional: we could track that this was AI-generated, but not required
    },
  }) as { id: string };

  // Return the problem ID and the content so the client can use it immediately
  return NextResponse.json({
    id: newProblem.id,
    problem: problemStatement,
    solution,
    topicSlug,
    difficulty,
  });
}