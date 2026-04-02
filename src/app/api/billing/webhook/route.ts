import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaddleWebhookSignature, PADDLE_PRICE_MAP } from "@/lib/payments/paddle";
import { changeUserPlan, parsePaddleSubscriptionStatus, parsePlanFromPaddlePrice } from "@/lib/billing/subscriptions";
import { Plan, SubscriptionStatus } from "@prisma/client";

type PaddleWebhookPayload = {
  event_type: string;
  data: any;
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

    const customData = data.custom_data ?? {};
    const userId = customData.userId as string | undefined;

    if (!userId && data.customer_id) {
      const byCustomer = await prisma.user.findFirst({
        where: { paddleCustomerId: String(data.customer_id) },
        select: { id: true },
      });
      if (byCustomer?.id) {
        await handleEvent(byCustomer.id, event, data);
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

async function handleEvent(userId: string, eventType: string, data: any) {
  const firstItem = data.items?.[0];
  const priceId = firstItem?.price?.id || firstItem?.price_id || data.price_id;
  const mappedPlan = priceId ? parsePlanFromPaddlePrice(String(priceId), PADDLE_PRICE_MAP) : "free";

  if (eventType === "subscription.created" || eventType === "subscription.updated") {
    const status = parsePaddleSubscriptionStatus(String(data.status || "inactive"));
    const periodEnd = data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null;

    await changeUserPlan({
      userId,
      plan: mappedPlan,
      subscriptionStatus: status,
      periodEnd,
      paddleCustomerId: data.customer_id ? String(data.customer_id) : undefined,
      paddleSubscriptionId: data.id ? String(data.id) : undefined,
      paddlePriceId: priceId ? String(priceId) : undefined,
    });

    return;
  }

  if (eventType === "subscription.canceled") {
    const periodEnd = data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null;

    await changeUserPlan({
      userId,
      plan: mappedPlan,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      periodEnd,
      paddleCustomerId: data.customer_id ? String(data.customer_id) : undefined,
      paddleSubscriptionId: data.id ? String(data.id) : undefined,
      paddlePriceId: priceId ? String(priceId) : undefined,
    });

    return;
  }

  if (eventType === "transaction.completed") {
    await changeUserPlan({
      userId,
      plan: mappedPlan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      periodEnd: data.billing_period?.ends_at ? new Date(data.billing_period.ends_at) : null,
      paddleCustomerId: data.customer_id ? String(data.customer_id) : undefined,
      paddlePriceId: priceId ? String(priceId) : undefined,
    });

    return;
  }

  if (eventType === "transaction.payment_failed") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user && user.plan !== Plan.FREE) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: SubscriptionStatus.PAST_DUE,
        },
      });
    }
  }
}
