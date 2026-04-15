import { db } from "@/lib/db";

export const LEARNING_FEATURES = {
  SPACED_REPETITION: "spaced_repetition",
  RETRIEVAL_PRACTICE: "retrieval_practice",
  INTERLEAVED_PRACTICE: "interleaved_practice",
  ELABORATIVE_INTERROGATION: "elaborative_interrogation",
  WORKED_EXAMPLE_STUDY: "worked_example_study",
  ERROR_ANALYSIS: "error_analysis",
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
};

export async function isFeatureEnabled(featureName: LearningFeatureName): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({
    where: { featureName },
    select: { enabled: true },
  });

  return flag?.enabled ?? defaultFeatureState[featureName] ?? false;
}

export async function getLearningFeatureFlags(): Promise<Record<LearningFeatureName, boolean>> {
  const rows = await db.featureFlag.findMany({
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
    merged[row.featureName as LearningFeatureName] = row.enabled;
  }

  return merged;
}
