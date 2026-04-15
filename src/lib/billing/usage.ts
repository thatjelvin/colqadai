import { Plan, SubscriptionStatus, UsageFeature } from "@/lib/db-types";
import { ACTIVE_SUBSCRIPTION_STATUSES, PLAN_CODE_BY_DB, PLAN_DEFINITIONS, PlanCode } from "./plans";
import { createAdminClient } from "@/lib/supabase/admin";

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

/** Formats a UTC day bucket as YYYY-MM-DD for the usage_events primary key. */
function usageBucketValue(bucket: Date): string {
  return bucket.toISOString().slice(0, 10);
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
  let profile: {
    plan: string | null;
    subscription_status: string | null;
    subscription_current_period_end: string | null;
  } | null = null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, subscription_status, subscription_current_period_end")
      .eq("id", userId)
      .maybeSingle();
    profile = data;
    if (error && error.code !== "PGRST116") {
      console.warn("BILLING WARN: failed to read profile for billing", { userId, error });
    }
  } catch (error) {
    console.warn("BILLING WARN: admin client unavailable for billing profile", { userId, error });
  }

  const plan = profile?.plan === "MAX" || profile?.plan === "PRO" ? (profile.plan as Plan) : Plan.FREE;
  const subscriptionStatus =
    profile?.subscription_status === "ACTIVE" ||
    profile?.subscription_status === "PAST_DUE" ||
    profile?.subscription_status === "CANCELED" ||
    profile?.subscription_status === "TRIALING"
      ? (profile.subscription_status as SubscriptionStatus)
      : SubscriptionStatus.INACTIVE;
  const periodEnd = profile?.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end)
    : null;

  const normalizedDbPlan = normalizePlan(plan, subscriptionStatus, periodEnd);

  return {
    userId,
    dbPlan: normalizedDbPlan,
    plan: PLAN_CODE_BY_DB[normalizedDbPlan],
    subscriptionStatus,
    subscriptionCurrentPeriodEnd: periodEnd,
  };
}

export async function getFeatureUsage(userId: string, feature: UsageFeature): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("usage_events")
      .select("count")
      .eq("user_id", userId)
      .eq("feature", feature)
      .eq("bucket", usageBucketValue(utcDayBucket()))
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("BILLING WARN: failed to read usage event", { userId, feature, error });
    }
    return data?.count ?? 0;
  } catch (error) {
    console.warn("BILLING WARN: usage event read skipped", { userId, feature, error });
    return 0;
  }
}

export async function consumeUsage(userId: string, feature: UsageFeature, amount = 1) {
  const profile = await getBillingProfile(userId);
  const planDef = PLAN_DEFINITIONS[profile.plan];
  const limitKey = usageFeatureToLimitKey[feature];
  const limit = planDef.limits[limitKey] as number;

  const bucket = utcDayBucket();
  const bucketValue = usageBucketValue(bucket);
  const currentCount = await getFeatureUsage(userId, feature);
  if (currentCount + amount > limit) {
    throw new BillingLimitError(
      `Daily ${feature.toLowerCase()} limit reached for ${planDef.name}.`,
      "USAGE_LIMIT_REACHED",
      429
    );
  }

  const updatedCount = currentCount + amount;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("usage_events").upsert(
      {
        user_id: userId,
        feature,
        bucket: bucketValue,
        count: updatedCount,
      },
      { onConflict: "user_id,feature,bucket" }
    );
    if (error) {
      console.warn("BILLING WARN: failed to persist usage event", { userId, feature, error });
    }
  } catch (error) {
    console.warn("BILLING WARN: usage event persistence skipped", { userId, feature, error });
  }

  return {
    used: updatedCount,
    limit,
    remaining: Math.max(0, limit - updatedCount),
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
