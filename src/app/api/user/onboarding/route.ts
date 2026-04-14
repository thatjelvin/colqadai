import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

const onboardingSchema = z.object({
  name: z.string().optional(),
  grade: z.string().min(1),
  course: z.string().min(1),
  age: z.number().min(1).max(120).optional(),
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await auth().catch((error) => {
    console.error("SIGNUP ERROR: onboarding auth() failed", error);
    return null;
  });

  const clerkUserId = authResult?.userId ?? null;
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch((error) => {
    console.error("SIGNUP ERROR: onboarding request JSON parse failed", error);
    return null;
  });

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const dbUser = await getOrCreateUserForClerkId(clerkUserId).catch((error) => {
    console.error("SIGNUP ERROR: onboarding user bootstrap failed", {
      clerkUserId,
      error,
    });
    return null;
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Failed to resolve user profile" }, { status: 500 });
  }

  const { name, grade, course, age, source } = parsed.data;

  const user = await prisma.user
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
      console.error("SIGNUP ERROR: onboarding user update failed", {
        clerkUserId,
        dbUserId: dbUser.id,
        error,
      });
      return null;
    });

  if (!user) {
    return NextResponse.json({ error: "Failed to save onboarding details" }, { status: 500 });
  }

  return NextResponse.json({ success: true, user });
}