import { db } from "@/lib/db";

/** Typed database client cast for the in-memory DB proxy. */
type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findUnique(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};
type PrismaLikeClient = {
  featureFlag: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

export const LEARNING_FEATURES = {
  SPACED_REPETITION: "spaced_repetition",
  RETRIEVAL_PRACTICE: "retrieval_practice",
  INTERLEAVED_PRACTICE: "interleaved_practice",
  ELABORATIVE_INTERROGATION: "elaborative_interrogation",
  WORKED_EXAMPLE_STUDY: "worked_example_study",
  ERROR_ANALYSIS: "error_analysis",
  AI_PROBLEM_GENERATION: "ai_problem_generation",
  PERSONALIZED_LEARNING_PATH: "personalized_learning_path",
  DAILY_CHALLENGE: "daily_challenge",
  CONCEPT_SPACED_REPETITION: "concept_spaced_repetition",
  STUDY_GROUPS: "study_groups",
  COMMUNITY_SOLUTIONS: "community_solutions",
} as const;

export type LearningFeatureName =
  (typeof LEARNING_FEATURES)[keyof typeof LEARNING_FEATURES];

const defaultFeatureState: Record<LearningFeatureName, boolean> = {
  spaced_repetition: true,
  retrieval_practice: true,
  interleaved_practice: true,
  elaborative_interrogation: true,
  worked_example_study: true,
  error_analysis: true,
  ai_problem_generation: true, // Enable by default
  personalized_learning_path: true, // Enable by default
  daily_challenge: true, // Enable by default
  concept_spaced_repetition: true, // Enable by default
  study_groups: true, // Enable by default
  community_solutions: true, // Enable by default
};

export async function isFeatureEnabled(featureName: LearningFeatureName): Promise<boolean> {
  const flag = await dbClient.featureFlag.findUnique({
    where: { featureName },
    select: { enabled: true },
  });

  return (flag?.enabled as boolean | undefined) ?? defaultFeatureState[featureName] ?? false;
}

export async function getLearningFeatureFlags(): Promise<Record<LearningFeatureName, boolean>> {
  const rows = await dbClient.featureFlag.findMany({
    where: {
      featureName: {
        in: Object.values(LEARNING_FEATURES),
      },
    },
    select: {
      featureName: true,
      enabled: true,
    },
  });

  const merged: Record<LearningFeatureName, boolean> = { ...defaultFeatureState };
  for (const row of rows) {
    merged[row.featureName as LearningFeatureName] = row.enabled as boolean;
  }

  return merged;
}