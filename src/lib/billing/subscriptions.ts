import { Plan, SubscriptionStatus, Tier } from "@/lib/db-types";
import { DB_PLAN_BY_CODE, PlanCode } from "./plans";
import { createAdminClient } from "@/lib/supabase/admin";

export async function changeUserPlan(params: {
  userId: string;
  plan: PlanCode;
  subscriptionStatus: SubscriptionStatus;
  periodEnd?: Date | null;
  paddleCustomerId?: string | null;
  paddleSubscriptionId?: string | null;
  paddlePriceId?: string | null;
}) {
  const {
    userId,
    plan,
    subscriptionStatus,
    periodEnd = null,
    paddleCustomerId,
    paddleSubscriptionId,
    paddlePriceId,
  } = params;

  const dbPlan = DB_PLAN_BY_CODE[plan];
  const dbTier = dbPlan === Plan.MAX ? Tier.MAX : dbPlan === Plan.PRO ? Tier.PRO : Tier.FREE;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        plan: dbPlan,
        tier: dbTier,
        subscription_status: subscriptionStatus,
        subscription_current_period_end: periodEnd?.toISOString() ?? null,
        paddle_customer_id: paddleCustomerId ?? null,
        paddle_subscription_id: paddleSubscriptionId ?? null,
        paddle_price_id: paddlePriceId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("BILLING WARN: failed to persist subscription profile", { userId, error });
    }
  } catch (error) {
    console.warn("BILLING WARN: admin client unavailable for subscription persistence", { userId, error });
  }

  return {
    id: userId,
    plan: dbPlan,
    tier: dbTier,
    subscriptionStatus,
    subscriptionCurrentPeriodEnd: periodEnd,
    paddleCustomerId: paddleCustomerId ?? null,
    paddleSubscriptionId: paddleSubscriptionId ?? null,
    paddlePriceId: paddlePriceId ?? null,
  };
}

export async function downgradeUserAfterPeriod(userId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        plan: Plan.FREE,
        tier: Tier.FREE,
        subscription_status: SubscriptionStatus.CANCELED,
        paddle_price_id: null,
        paddle_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.warn("BILLING WARN: failed to downgrade profile", { userId, error });
    }
  } catch (error) {
    console.warn("BILLING WARN: admin client unavailable for profile downgrade", { userId, error });
  }

  return {
    id: userId,
    plan: Plan.FREE,
    tier: Tier.FREE,
    subscriptionStatus: SubscriptionStatus.CANCELED,
    paddlePriceId: null,
    paddleSubscriptionId: null,
  };
}

export function parsePaddleSubscriptionStatus(status: string): SubscriptionStatus {
  const normalized = status.toLowerCase();
  if (normalized === "active") return SubscriptionStatus.ACTIVE;
  if (normalized === "trialing") return SubscriptionStatus.TRIALING;
  if (normalized === "past_due") return SubscriptionStatus.PAST_DUE;
  if (normalized === "canceled") return SubscriptionStatus.CANCELED;
  return SubscriptionStatus.INACTIVE;
}

export function parsePlanFromPaddlePrice(priceId: string, priceMap: Record<string, PlanCode>): PlanCode {
  return priceMap[priceId] ?? "free";
}
