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
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForClerkId(clerkUserId);

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const { name, grade, course, age, source } = parsed.data;

    const user = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        ...(name !== undefined && { name }),
        grade,
        course,
        age,
        source,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}