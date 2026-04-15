import { Plan, SubscriptionStatus, Tier } from "@prisma/client";
import { DB_PLAN_BY_CODE, PlanCode } from "./plans";

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
