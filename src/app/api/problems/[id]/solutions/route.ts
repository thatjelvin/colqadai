import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { submitSolution, getSolutions } from "@/lib/solutions";
import { db } from "@/lib/db";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};
type PrismaLikeClient = {
  communitySolution: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

    const solutions = await getSolutions(params.id, dbUser.id);
    return NextResponse.json({ solutions });
  } catch (error) {
    console.error("Error fetching solutions:", error);
    return NextResponse.json({ solutions: [], error: "Failed to load solutions" }, { status: 500 });
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
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

    const body = await req.json();
    const { solution, isAlternativeMethod } = body;

    if (!solution || typeof solution !== "string" || !solution.trim()) {
      return NextResponse.json({ error: "Solution is required" }, { status: 400 });
    }

    // Compare to official solution to detect alternative method
    let autoAlternative = !!isAlternativeMethod;

    if (!autoAlternative) {
      // Check if this looks like an alternative approach using heuristics
      // (AI comparison would be ideal but we keep it simple)
      const existing = await dbClient.communitySolution.findFirst({
        where: { problemId: params.id },
        select: { solution: true },
      }) as DbRecord | null;

      // If there are already solutions for this problem, this could be alternative
      if (existing) {
        autoAlternative = true; // Multiple approaches posted = likely alternative
      }
    }

    const result = await submitSolution(dbUser.id, params.id, solution, autoAlternative);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Error submitting solution:", error);
    return NextResponse.json({ error: "Failed to submit solution" }, { status: 500 });
  }
}
