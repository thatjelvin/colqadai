import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

function redirectWithError(requestUrl: string, message: string) {
  const url = new URL("/login", requestUrl);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const callbackError =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (callbackError) {
    return redirectWithError(request.url, callbackError);
  }

  const supabase = createServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("AUTH ERROR: code exchange failed", error);
      return redirectWithError(request.url, "We could not complete sign-in. Please try again.");
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      console.error("AUTH ERROR: OTP verification failed", error);
      return redirectWithError(request.url, "Your confirmation link is invalid or expired.");
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    if (userError) {
      console.error("AUTH ERROR: failed to read callback user", userError);
    }
    return redirectWithError(request.url, "Please sign in to continue.");
  }

  const dbUser = await getOrCreateUserForSupabaseId(
    user.id,
    user.email,
    (user.user_metadata?.full_name as string | undefined) ?? null
  ).catch((error) => {
    console.error("AUTH ERROR: failed to resolve app user after callback", {
      supabaseId: user.id,
      error,
    });
    return null;
  });

  if (!dbUser) {
    return redirectWithError(request.url, "We could not prepare your account. Please try again.");
  }

  const destination = dbUser.grade ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(destination, request.url));
}
