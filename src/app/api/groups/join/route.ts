export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { joinGroup } from "@/lib/groups";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const result = await joinGroup(dbUser.id, inviteCode);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, groupId: result.groupId });
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}
