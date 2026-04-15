import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=user_not_found`);
  }

  try {
    await getOrCreateUserForSupabaseId(user.id, user.email, user.user_metadata?.full_name ?? null);
  } catch (dbError) {
    console.error("OAuth user provisioning error:", dbError);
    return NextResponse.redirect(`${origin}/login?error=account_setup_failed`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
