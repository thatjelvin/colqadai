export const Plan = {
  FREE: "FREE",
  PRO: "PRO",
  MAX: "MAX",
} as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

export const Tier = {
  FREE: "FREE",
  PRO: "PRO",
  MAX: "MAX",
} as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

export const SubscriptionStatus = {
  INACTIVE: "INACTIVE",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
  TRIALING: "TRIALING",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const UsageFeature = {
  CHAT_MESSAGE: "CHAT_MESSAGE",
  NEW_CHAT_SESSION: "NEW_CHAT_SESSION",
  PROBLEM_START: "PROBLEM_START",
  MATERIAL_SUMMARY: "MATERIAL_SUMMARY",
} as const;
export type UsageFeature = (typeof UsageFeature)[keyof typeof UsageFeature];

export const Difficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const ReviewStatus = {
  NEW: "NEW",
  LEARNING: "LEARNING",
  REVIEW: "REVIEW",
  MASTERED: "MASTERED",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const LearningMethod = {
  SPACED_REPETITION: "SPACED_REPETITION",
  INTERLEAVED_PRACTICE: "INTERLEAVED_PRACTICE",
  RETRIEVAL_PRACTICE: "RETRIEVAL_PRACTICE",
  WORKED_EXAMPLE_STUDY: "WORKED_EXAMPLE_STUDY",
  ERROR_ANALYSIS: "ERROR_ANALYSIS",
  ELABORATIVE_INTERROGATION: "ELABORATIVE_INTERROGATION",
} as const;
export type LearningMethod = (typeof LearningMethod)[keyof typeof LearningMethod];

export const ErrorType = {
  CONCEPTUAL_GAP: "CONCEPTUAL_GAP",
  ALGEBRAIC_SLIP: "ALGEBRAIC_SLIP",
  MISREAD_QUESTION: "MISREAD_QUESTION",
  FORMULA_RECALL_FAILURE: "FORMULA_RECALL_FAILURE",
  WRONG_METHOD_CHOSEN: "WRONG_METHOD_CHOSEN",
} as const;
export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

export const NotebookSourceType = {
  TEXT: "TEXT",
  PDF: "PDF",
} as const;
export type NotebookSourceType = (typeof NotebookSourceType)[keyof typeof NotebookSourceType];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type ProfileRow = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  grade?: string | null;
  course?: string | null;
  age?: number | null;
  source?: string | null;
  challenge?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  paddle_price_id?: string | null;
  created_at?: string | null;
  onboarding_completed?: boolean | null;
};
