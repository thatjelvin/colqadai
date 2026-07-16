export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { checkPrerequisites } from "@/lib/learning/prerequisites";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

    const result = await checkPrerequisites(dbUser.id, params.slug);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking prerequisites:", error);
    return NextResponse.json(
      { ready: true, missing: [], details: [] },
      { status: 200 }
    );
  }
}
