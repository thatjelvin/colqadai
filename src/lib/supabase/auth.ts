"use client";

import type { AuthError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const GOOGLE_PROVIDER_DISABLED_MESSAGE =
  "Google sign-in is not enabled right now. Continue with email and password or enable the Google provider in Supabase Auth settings.";

const EMAIL_PROVIDER_DISABLED_MESSAGE =
  "Email/password sign-up is not enabled right now. Enable the Email provider in Supabase Auth settings.";

function isProviderDisabledError(error: AuthError | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "validation_failed" &&
    error?.status === 400 &&
    (message.includes("unsupported provider") || message.includes("provider is not enabled"))
  );
}

function toAuthError(message: string): AuthError {
  return {
    name: "AuthApiError",
    message,
    status: 400,
    code: "validation_failed",
  } as AuthError;
}

export function getAuthErrorMessage(error: AuthError | null | undefined, fallback: string) {
  if (!error) return fallback;
  return error.message || fallback;
}

export function isGoogleOAuthEnabled() {
  return process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_AUTH_ENABLED !== "false";
}

export async function signUp(email: string, password: string, name?: string) {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { full_name: name } : undefined,
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    },
  });

  if (isProviderDisabledError(result.error)) {
    return { ...result, error: toAuthError(EMAIL_PROVIDER_DISABLED_MESSAGE) };
  }

  return result;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    },
  });

  if (isProviderDisabledError(result.error)) {
    return { ...result, error: toAuthError(GOOGLE_PROVIDER_DISABLED_MESSAGE) };
  }

  return result;
}


export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signOut();
}

export async function getCurrentSession() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.getSession();
}

export async function getCurrentUser() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.getUser();
}
