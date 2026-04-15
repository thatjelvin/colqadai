import { Plan, SubscriptionStatus, UsageFeature } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACTIVE_SUBSCRIPTION_STATUSES, PLAN_CODE_BY_DB, PLAN_DEFINITIONS, PlanCode } from "./plans";

export class BillingLimitError extends Error {
  status: number;
  code: string;

  constructor(message: string, code: string, status = 429) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type BillingProfile = {
  userId: string;
  plan: PlanCode;
  dbPlan: Plan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: Date | null;
};

const usageFeatureToLimitKey: Record<UsageFeature, keyof typeof PLAN_DEFINITIONS.free.limits> = {
  CHAT_MESSAGE: "chatMessagesPerDay",
  NEW_CHAT_SESSION: "newChatSessionsPerDay",
  PROBLEM_START: "problemStartsPerDay",
};

function utcDayBucket(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizePlan(dbPlan: Plan, subscriptionStatus: SubscriptionStatus, periodEnd: Date | null): Plan {
  if (dbPlan === Plan.FREE) {
    return Plan.FREE;
  }

  if (subscriptionStatus === SubscriptionStatus.CANCELED && periodEnd && periodEnd.getTime() > Date.now()) {
    return dbPlan;
  }

  const paidIsActive = ACTIVE_SUBSCRIPTION_STATUSES.includes(subscriptionStatus);
  return paidIsActive ? dbPlan : Plan.FREE;
}

export async function getBillingProfile(userId: string): Promise<BillingProfile> {
  const normalizedDbPlan = normalizePlan(Plan.FREE, SubscriptionStatus.INACTIVE, null);

  return {
    userId,
    dbPlan: normalizedDbPlan,
    plan: PLAN_CODE_BY_DB[normalizedDbPlan],
    subscriptionStatus: SubscriptionStatus.INACTIVE,
    subscriptionCurrentPeriodEnd: null,
  };
}

export async function getFeatureUsage(userId: string, feature: UsageFeature): Promise<number> {
  const event = await prisma.usageEvent.findUnique({
    where: {
      userId_feature_bucket: {
        userId,
        feature,
        bucket: utcDayBucket(),
      },
    },
    select: { count: true },
  });

  return event?.count ?? 0;
}

export async function consumeUsage(userId: string, feature: UsageFeature, amount = 1) {
  const profile = await getBillingProfile(userId);
  const planDef = PLAN_DEFINITIONS[profile.plan];
  const limitKey = usageFeatureToLimitKey[feature];
  const limit = planDef.limits[limitKey] as number;

  const bucket = utcDayBucket();
  const existing = await prisma.usageEvent.findUnique({
    where: {
      userId_feature_bucket: {
        userId,
        feature,
        bucket,
      },
    },
    select: { count: true },
  });

  const currentCount = existing?.count ?? 0;
  if (currentCount + amount > limit) {
    throw new BillingLimitError(
      `Daily ${feature.toLowerCase()} limit reached for ${planDef.name}.`,
      "USAGE_LIMIT_REACHED",
      429
    );
  }

  const updated = await prisma.usageEvent.upsert({
    where: {
      userId_feature_bucket: {
        userId,
        feature,
        bucket,
      },
    },
    create: {
      userId,
      feature,
      bucket,
      count: amount,
    },
    update: {
      count: { increment: amount },
    },
    select: { count: true },
  });

  return {
    used: updated.count,
    limit,
    remaining: Math.max(0, limit - updated.count),
    plan: profile.plan,
  };
}

export async function ensureFeatureAccess(userId: string, feature: "analytics" | "notebooks") {
  const profile = await getBillingProfile(userId);
  const limits = PLAN_DEFINITIONS[profile.plan].limits;

  const allowed = feature === "analytics" ? limits.analyticsAccess : limits.notebooksAccess;
  if (!allowed) {
    throw new BillingLimitError(`This feature requires a paid plan.`, "FEATURE_LOCKED", 403);
  }

  return profile;
}

export async function getUsageSummary(userId: string) {
  const profile = await getBillingProfile(userId);

  const [chatMessagesUsed, sessionsUsed, startsUsed] = await Promise.all([
    getFeatureUsage(userId, UsageFeature.CHAT_MESSAGE),
    getFeatureUsage(userId, UsageFeature.NEW_CHAT_SESSION),
    getFeatureUsage(userId, UsageFeature.PROBLEM_START),
  ]);

  const limits = PLAN_DEFINITIONS[profile.plan].limits;

  return {
    plan: profile.plan,
    subscriptionStatus: profile.subscriptionStatus,
    usage: {
      chatMessages: {
        used: chatMessagesUsed,
        limit: limits.chatMessagesPerDay,
      },
      newChatSessions: {
        used: sessionsUsed,
        limit: limits.newChatSessionsPerDay,
      },
      problemStarts: {
        used: startsUsed,
        limit: limits.problemStartsPerDay,
      },
    },
    access: {
      analytics: limits.analyticsAccess,
      notebooks: limits.notebooksAccess,
      priorityResponses: limits.priorityResponses,
      earlyAccess: limits.earlyAccess,
    },
  };
}

export function buildUpgradeErrorPayload(error: BillingLimitError) {
  return {
    error: error.message,
    code: error.code,
    upgradeUrl: "/pricing",
  };
}
