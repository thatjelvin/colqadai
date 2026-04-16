import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const onboardingSchema = z.object({
  name: z.string().optional(),
  grade: z.string().min(1),
  course: z.string().min(1),
  age: z.number().min(1).max(120).optional(),
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch((error) => {
    console.error("AUTH ERROR: onboarding request JSON parse failed", error);
    return null;
  });

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const { name, grade, course, age, source } = parsed.data;
  if (name !== undefined) {
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    if (authUpdateError) {
      console.warn("AUTH WARN: failed to update auth profile name", authUpdateError);
    }
  }

  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: name ?? user.user_metadata?.full_name ?? null,
        grade,
        course,
        age: age ?? null,
        source: source ?? null,
        onboarding_completed: true,
      },
      { onConflict: "id" }
    );

  if (profileUpsertError) {
    console.warn("AUTH WARN: onboarding profile upsert failed", profileUpsertError);
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
      source: source ?? null,
    },
  });
}
