import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

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

  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!).catch((error) => {
    console.error("AUTH ERROR: onboarding user bootstrap failed", {
      supabaseId: user.id,
      error,
    });
    return null;
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Failed to resolve user profile" }, { status: 500 });
  }

  const { name, grade, course, age, source } = parsed.data;

  const updatedUser = await prisma.user
    .update({
      where: { id: dbUser.id },
      data: {
        ...(name !== undefined && { name }),
        grade,
        course,
        age,
        source,
      },
    })
    .catch((error) => {
      console.error("AUTH ERROR: onboarding user update failed", {
        supabaseId: user.id,
        dbUserId: dbUser.id,
        error,
      });
      return null;
    });

  if (!updatedUser) {
    return NextResponse.json({ error: "Failed to save onboarding details" }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: updatedUser });
}