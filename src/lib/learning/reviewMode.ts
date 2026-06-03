export type ReviewMode = "beginner" | "mastery";

export const BEGINNER_PROBLEM_COUNT = 3;
export const MASTERY_PROBLEM_COUNT = 6;
export const BEGINNER_MASTERY_THRESHOLD = 30;
export const BEGINNER_SESSION_THRESHOLD = 2;

export const BEGINNER_RATING_VALUES = [0, 1, 2, 3] as const;
export const MASTERY_RATING_VALUES = [0, 1, 2, 3, 4, 5] as const;

export type BeginnerRating = (typeof BEGINNER_RATING_VALUES)[number];
export type MasteryRating = (typeof MASTERY_RATING_VALUES)[number];

export const BEGINNER_RATING_LABELS: Record<BeginnerRating, string> = {
  0: "Show me",
  1: "Tough",
  2: "Got it",
  3: "Easy",
};

export const MASTERY_RATING_LABELS: Record<MasteryRating, string> = {
  0: "Blackout",
  1: "Wrong",
  2: "Hard",
  3: "Hesitant",
  4: "Good",
  5: "Perfect",
};

export interface ReviewModeInput {
  sessionCount: number;
  masteryPercentage: number;
}

export function getReviewMode(input: ReviewModeInput): ReviewMode {
  if (input.sessionCount < BEGINNER_SESSION_THRESHOLD) return "beginner";
  if (input.masteryPercentage < BEGINNER_MASTERY_THRESHOLD) return "beginner";
  return "mastery";
}

export function problemCountForMode(mode: ReviewMode): number {
  return mode === "beginner" ? BEGINNER_PROBLEM_COUNT : MASTERY_PROBLEM_COUNT;
}

export function detectModeTransition(
  previousMode: ReviewMode | null,
  newMode: ReviewMode
): { transitioned: boolean; previousMode: ReviewMode | null; newMode: ReviewMode } {
  if (previousMode === null) {
    return { transitioned: false, previousMode: null, newMode };
  }
  if (previousMode !== newMode) {
    return { transitioned: true, previousMode, newMode };
  }
  return { transitioned: false, previousMode, newMode };
}

export function shouldUseHints(mode: ReviewMode): boolean {
  return mode === "beginner";
}
