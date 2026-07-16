import { ErrorType } from "@/lib/db-types";

/**
 * Growth mindset messages based on research (Dweck, 2006; Yeager & Dweck, 2012).
 * Each error type gets a specific message that:
 * - Normalizes struggle
 * - Reframes errors as learning data
 * - Uses process praise (not person praise)
 * - Builds identity ("you're becoming...")
 */

const ERROR_TYPE_MESSAGES: Record<string, string> = {
  [ErrorType.CONCEPTUAL_GAP]:
    "This is where real learning happens — let's figure out what's clicking and what's not.",
  [ErrorType.ALGEBRAIC_SLIP]:
    "Almost! Small slips mean you understand the concept — you're just refining execution.",
  [ErrorType.MISREAD_QUESTION]:
    "Reading carefully is a skill you're building. Let's look at this again with fresh eyes.",
  [ErrorType.FORMULA_RECALL_FAILURE]:
    "Forgetting formulas is normal — the more you use them, the stickier they get. This is your brain telling you it needs more reps.",
  [ErrorType.WRONG_METHOD_CHOSEN]:
    "Choosing the right approach is the hardest part. Now you know one path that doesn't work, which gets you closer to the one that does.",
};

const CORRECT_AFTER_STRUGGLE_MESSAGES = [
  "You worked through that. The struggle means your brain is building stronger pathways.",
  "That wasn't easy, and you got it anyway. That's how real learning works.",
  "Persistence pays off — you just proved that.",
  "The fact that it didn't click immediately means you're pushing your limits. That's exactly where growth happens.",
];

const FIRST_TRY_MESSAGES = [
  "First try! Your understanding is solid.",
  "Nailed it on the first attempt — your foundation is strong.",
  "Clean solve. You've got this concept down.",
];

/**
 * Pick a deterministic message from an array based on a seed number.
 */
function pickFromSeed(messages: string[], seed: number): string {
  return messages[seed % messages.length];
}

/**
 * Returns a growth mindset message based on the attempt result.
 *
 * @param isCorrect - Whether the answer was correct
 * @param errorType - The classified error type (if incorrect)
 * @param attemptNumber - Which attempt this is (1 = first try)
 * @returns A growth mindset message string
 */
export function getMindsetMessage(
  isCorrect: boolean,
  errorType: string | null | undefined,
  attemptNumber: number
): string {
  if (isCorrect && attemptNumber === 1) {
    return pickFromSeed(FIRST_TRY_MESSAGES, attemptNumber);
  }

  if (isCorrect && attemptNumber > 1) {
    return pickFromSeed(CORRECT_AFTER_STRUGGLE_MESSAGES, attemptNumber);
  }

  // Incorrect — use error-type-specific message
  if (errorType && ERROR_TYPE_MESSAGES[errorType]) {
    return ERROR_TYPE_MESSAGES[errorType];
  }

  // Fallback for unclassified errors
  return "Every mistake is data. Let's figure out what this one is telling you.";
}

/**
 * Milestone thresholds for streak badges.
 */
export const STREAK_MILESTONES = [
  { days: 7, badge: "🔥 7-Day Warrior", message: "You're building a habit — keep fueling the fire." },
  { days: 14, badge: "⚡ 2-Week Streak", message: "Two weeks strong. Math is becoming part of your routine." },
  { days: 30, badge: "🏆 30-Day Champion", message: "You're becoming a math person." },
  { days: 50, badge: "💎 50-Day Legend", message: "Discipline like this changes everything." },
  { days: 100, badge: "🌟 100-Day Master", message: "Triple digits. You're in elite territory." },
  { days: 200, badge: "👑 200-Day Royalty", message: "Mathematical royalty. Few ever reach this." },
  { days: 365, badge: "🎓 365-Day Graduate", message: "A full year. You've transformed." },
] as const;

/**
 * Returns the current streak milestone (if any) and the next one.
 */
export function getStreakMilestoneInfo(streak: number): {
  current: (typeof STREAK_MILESTONES)[number] | null;
  next: (typeof STREAK_MILESTONES)[number] | null;
  daysUntilNext: number;
  identityMessage: string;
} {
  let current: (typeof STREAK_MILESTONES)[number] | null = null;

  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone.days) {
      current = milestone;
    }
  }

  const currentIdx = current
    ? STREAK_MILESTONES.findIndex((m) => m.days === current!.days)
    : -1;
  const next = currentIdx < STREAK_MILESTONES.length - 1
    ? STREAK_MILESTONES[currentIdx + 1]
    : null;

  const daysUntilNext = next ? Math.max(0, next.days - streak) : 0;

  let identityMessage: string;
  if (streak >= 30) {
    identityMessage = "You're becoming a math person.";
  } else if (streak >= 7) {
    identityMessage = "You're building a habit.";
  } else if (streak >= 1) {
    identityMessage = "Keep it going — every day counts.";
  } else {
    identityMessage = "Start your streak today.";
  }

  return { current, next, daysUntilNext, identityMessage };
}
