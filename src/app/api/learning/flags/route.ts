import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { getLearningFeatureFlags } from "@/lib/learning/featureFlags";

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { return new Response("Unauthorized", { status: 401 }); }
  await getOrCreateUserForSupabaseId(user.id, user.email!);

  const flags = await getLearningFeatureFlags();
  return NextResponse.json(flags);
}
