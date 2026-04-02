import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { changeUserPlan } from "@/lib/billing/subscriptions";
import { SubscriptionStatus } from "@prisma/client";

const changePlanSchema = z.object({
  plan: z.enum(["free", "pro", "max"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
