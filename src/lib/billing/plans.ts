import { Plan, SubscriptionStatus } from "@/lib/db-types";

export type PlanCode = "free" | "pro" | "max";

export type PlanLimits = {
  chatMessagesPerDay: number;
  newChatSessionsPerDay: number;
  problemStartsPerDay: number;
  materialSummariesPerDay: number;
  analyticsAccess: boolean;
  notebooksAccess: boolean;
  notebooksLimit: number;
  priorityResponses: boolean;
  earlyAccess: boolean;
};

export type PlanDefinition = {
  code: PlanCode;
  dbValue: Plan;
  name: string;
  monthlyPriceUsd: number;
  features: string[];
  limits: PlanLimits;
};

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  free: {
    code: "free",
    dbValue: Plan.FREE,
    name: "Free",
    monthlyPriceUsd: 0,
    features: [
      "Spaced repetition review engine",
      "Topic browsing and problem practice",
      "Basic AI tutor chat",
      "Progress dashboard",
    ],
    limits: {
      chatMessagesPerDay: 10,
      newChatSessionsPerDay: 3,
      problemStartsPerDay: 20,
      materialSummariesPerDay: 5,
      analyticsAccess: false,
      notebooksAccess: false,
      notebooksLimit: 0,
      priorityResponses: false,
      earlyAccess: false,
    },
  },
  pro: {
    code: "pro",
    dbValue: Plan.PRO,
    name: "Pro",
    monthlyPriceUsd: 6.99,
    features: [
      "Everything in Free",
      "Advanced analytics",
      "Notebooks workspace",
      "High AI chat quota",
      "Higher daily practice throughput",
    ],
    limits: {
      chatMessagesPerDay: 120,
      newChatSessionsPerDay: 30,
      problemStartsPerDay: 200,
      materialSummariesPerDay: 999,
      analyticsAccess: true,
      notebooksAccess: true,
      notebooksLimit: 10,
      priorityResponses: false,
      earlyAccess: false,
    },
  },
  max: {
    code: "max",
    dbValue: Plan.MAX,
    name: "Max",
    monthlyPriceUsd: 16.99,
    features: [
      "Everything in Pro",
      "Very high AI usage allowance",
      "Priority processing lane",
      "Early access to experimental features",
    ],
    limits: {
      chatMessagesPerDay: 600,
      newChatSessionsPerDay: 120,
      problemStartsPerDay: 1000,
      materialSummariesPerDay: 999,
      analyticsAccess: true,
      notebooksAccess: true,
      notebooksLimit: 999,
      priorityResponses: true,
      earlyAccess: true,
    },
  },
};

export const PLAN_CODE_BY_DB: Record<Plan, PlanCode> = {
  [Plan.FREE]: "free",
  [Plan.PRO]: "pro",
  [Plan.MAX]: "max",
};

export const DB_PLAN_BY_CODE: Record<PlanCode, Plan> = {
  free: Plan.FREE,
  pro: Plan.PRO,
  max: Plan.MAX,
};

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

export function isPaidPlan(code: PlanCode): boolean {
  return code === "pro" || code === "max";
}
