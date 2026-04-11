"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function signUp(email: string, password: string, name?: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { full_name: name } : undefined,
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    },
  });
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    },
  });
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
