export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { getUsageSummary } from "@/lib/billing/usage";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return new Response("Unauthorized", { status: 401 }); }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

    const summary = await getUsageSummary(dbUser.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
