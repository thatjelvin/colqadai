import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  if (!clerkUserId) { return new Response("Unauthorized", { status: 401 }); }
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) { return new Response("User not found in DB", { status: 404 }); }
  const session = { user: { id: dbUser.id, name: dbUser.name } };
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const { name, grade, course, age, source } = parsed.data;

    const user = await prisma.user.update({
      where: { id: session.user.id },
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