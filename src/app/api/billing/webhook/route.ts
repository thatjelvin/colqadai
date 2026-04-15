export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { verifyPaddleWebhookSignature, PADDLE_PRICE_MAP } from "@/lib/payments/paddle";
import { changeUserPlan, parsePaddleSubscriptionStatus, parsePlanFromPaddlePrice } from "@/lib/billing/subscriptions";
import { SubscriptionStatus } from "@prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";

type PaddleWebhookPayload = {
  event_type: string;
  data: Record<string, unknown> | null;
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature");

    const isValid = verifyPaddleWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as PaddleWebhookPayload;
    const event = payload.event_type;
    const data = payload.data;

    if (!data) {
      return NextResponse.json({ received: true });
    }

    const customData = asRecord(data.custom_data);
    const userId = asString(customData.userId);

    if (!userId && data.customer_id) {
      try {
        const supabase = createAdminClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("paddle_customer_id", String(data.customer_id))
          .maybeSingle();

        if (profile?.id) {
          await handleEvent(profile.id, event, data);
        }
      } catch (error) {
        console.warn("BILLING WARN: unable to resolve profile by customer id", error);
      }
      return NextResponse.json({ received: true });
    }

    if (!userId) {
      return NextResponse.json({ received: true });
    }

    await handleEvent(userId, event, data);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function handleEvent(userId: string, eventType: string, data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? data.items : [];
  const firstItem = asRecord(items[0]);
  const firstItemPrice = asRecord(firstItem.price);
  const priceId =
    asString(firstItemPrice.id) ?? asString(firstItem.price_id) ?? asString(data.price_id);
  const mappedPlan = priceId ? parsePlanFromPaddlePrice(String(priceId), PADDLE_PRICE_MAP) : "free";

  if (eventType === "subscription.created" || eventType === "subscription.updated") {
    const status = parsePaddleSubscriptionStatus(asString(data.status) ?? "inactive");
    const currentBilling = asRecord(data.current_billing_period);
    const periodEnd = asString(currentBilling.ends_at) ? new Date(String(currentBilling.ends_at)) : null;

    await changeUserPlan({
      userId,
      plan: mappedPlan,
      subscriptionStatus: status,
      periodEnd,
      paddleCustomerId: asString(data.customer_id),
      paddleSubscriptionId: asString(data.id),
      paddlePriceId: priceId ? String(priceId) : undefined,
    });

    return;
  }

  if (eventType === "subscription.canceled") {
    const currentBilling = asRecord(data.current_billing_period);
    const periodEnd = asString(currentBilling.ends_at) ? new Date(String(currentBilling.ends_at)) : null;

    await changeUserPlan({
      userId,
      plan: mappedPlan,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      periodEnd,
      paddleCustomerId: asString(data.customer_id),
      paddleSubscriptionId: asString(data.id),
      paddlePriceId: priceId ? String(priceId) : undefined,
    });

    return;
  }

  if (eventType === "transaction.completed") {
    await changeUserPlan({
      userId,
      plan: mappedPlan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      periodEnd: asString(asRecord(data.billing_period).ends_at)
        ? new Date(String(asRecord(data.billing_period).ends_at))
        : null,
      paddleCustomerId: asString(data.customer_id),
      paddlePriceId: priceId ? String(priceId) : undefined,
    });

    return;
  }

  if (eventType === "transaction.payment_failed") {
    await changeUserPlan({
      userId,
      plan: "free",
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
      periodEnd: null,
      paddleCustomerId: asString(data.customer_id),
      paddlePriceId: priceId ? String(priceId) : undefined,
    });
  }
}
