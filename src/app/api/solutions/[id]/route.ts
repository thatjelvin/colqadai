import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { reportSolution, deleteSolution } from "@/lib/solutions";

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
    const { reason } = body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const result = await reportSolution(dbUser.id, params.id, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reporting solution:", error);
    return NextResponse.json({ error: "Failed to report solution" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

    const result = await deleteSolution(dbUser.id, params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting solution:", error);
    return NextResponse.json({ error: "Failed to delete solution" }, { status: 500 });
  }
}
