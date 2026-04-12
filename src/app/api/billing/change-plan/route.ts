import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { changeUserPlan } from "@/lib/billing/subscriptions";
import { SubscriptionStatus } from "@prisma/client";

const changePlanSchema = z.object({
  plan: z.enum(["free", "pro", "max"]),
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
    const parsed = changePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data.plan !== "free") {
      return NextResponse.json({ error: "Use checkout for paid upgrades." }, { status: 400 });
    }

    await changeUserPlan({
      userId: session.user.id,
      plan: "free",
      subscriptionStatus: SubscriptionStatus.INACTIVE,
      periodEnd: null,
      paddleSubscriptionId: null,
      paddlePriceId: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing plan:", error);
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}
