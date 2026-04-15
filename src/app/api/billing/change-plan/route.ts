export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { changeUserPlan } from "@/lib/billing/subscriptions";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { SubscriptionStatus } from "@/lib/db-types";

const changePlanSchema = z.object({
  plan: z.enum(["free", "pro", "max"]),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);

    const body = await req.json();
    const parsed = changePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data.plan !== "free") {
      return NextResponse.json({ error: "Use checkout for paid upgrades." }, { status: 400 });
    }

    await changeUserPlan({
      userId: dbUser.id,
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
