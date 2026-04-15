import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("[OAuth] CALLBACK REACHED");
  console.log("[OAuth] callback: request.url =", request.url);
  console.log("[OAuth] callback: code present =", !!code);
  console.log("[OAuth] callback: NEXT_PUBLIC_SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("[OAuth] callback: NEXT_PUBLIC_SUPABASE_ANON_KEY present =", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

  return NextResponse.redirect(`${origin}/dashboard`);
}
