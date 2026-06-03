import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().optional(),
  grade: z.string().min(1),
  course: z.string().min(1),
  age: z.number().min(1).max(120).optional(),
  theme_preference: z.enum(["light", "dark", "system"]).optional(),
});

export async function GET() {
  const supabase = createServerClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("theme_preference, full_name, grade, course, age")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("PROFILE WARN: failed to fetch profile preferences", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }

  return NextResponse.json({
    theme_preference: data?.theme_preference ?? "system",
    name: data?.full_name ?? null,
    grade: data?.grade ?? null,
    course: data?.course ?? null,
    age: data?.age ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const { name, grade, course, age, theme_preference } = parsed.data;

  if (name !== undefined) {
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    if (authUpdateError) {
      console.warn("PROFILE WARN: failed to update auth profile name", authUpdateError);
    }
  }

  const upsertPayload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    full_name: name ?? user.user_metadata?.full_name ?? null,
    grade,
    course,
    age: age ?? null,
  };
  if (theme_preference !== undefined) {
    upsertPayload.theme_preference = theme_preference;
  }

  const { error: profileUpsertError } = await adminSupabase
    .from("profiles")
    .upsert(upsertPayload, { onConflict: "id" });

  if (profileUpsertError) {
    console.warn("PROFILE WARN: profile upsert failed", profileUpsertError);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: name ?? user.user_metadata?.full_name ?? null,
      grade,
      course,
      age: age ?? null,
      theme_preference: theme_preference ?? null,
    },
  });
}
