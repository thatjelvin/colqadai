/**
 * Notification message builders for different types of reminders.
 */

export type NotificationPreferences = {
  dailyReminder: boolean;
  dailyReminderTime: string;
  streakAtRisk: boolean;
  milestoneCongrats: boolean;
  weeklySummary: boolean;
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  dailyReminder: true,
  dailyReminderTime: "09:00",
  streakAtRisk: true,
  milestoneCongrats: true,
  weeklySummary: true,
};

export const MILESTONE_DAYS = [7, 14, 30, 50, 100];

/**
 * Build daily reminder message based on due count.
 */
export function buildDailyReminder(dueCount: number): string {
  if (dueCount === 0) {
    return "You're all caught up! Great job staying on top of your reviews.";
  }
  if (dueCount === 1) {
    return "You have 1 problem due for review. Keep your streak going!";
  }
  return `You have ${dueCount} problems due for review. Time to stay sharp!`;
}

/**
 * Build streak-at-risk warning message.
 */
export function buildStreakAtRiskMessage(currentStreak: number): string {
  if (currentStreak >= 30) {
    return `🔥 Your ${currentStreak}-day streak is incredible! Don't break it now - review today to keep it going.`;
  }
  if (currentStreak >= 14) {
    return `💪 Impressive ${currentStreak}-day streak! One quick review will keep it alive.`;
  }
  if (currentStreak >= 7) {
    return `📈 Solid ${currentStreak}-day streak building! Review now to maintain your momentum.`;
  }
  return `Keep your ${currentStreak}-day streak going! Just one review today will extend it.`;
}

/**
 * Build weekly summary message.
 */
export function buildWeeklySummary(stats: {
  problemsSolved: number;
  correctCount: number;
  totalAttempts: number;
  streak: number;
}): string {
  const accuracy = stats.totalAttempts > 0
    ? Math.round((stats.correctCount / stats.totalAttempts) * 100)
    : 0;

  return `Last week you solved ${stats.problemsSolved} problems with ${accuracy}% accuracy. Your current streak is ${stats.streak} days. Keep up the great work!`;
}

/**
 * Get milestone information for a streak.
 */
export function getMilestoneInfo(streak: number): {
  atMilestone: boolean;
  milestone: number | null;
  message: string | null;
} {
  const MESSAGES: Record<number, string> = {
    7: "One week strong! You've built a solid foundation.",
    14: "Two weeks in - you're really getting into the groove!",
    30: "One month milestone! Incredible dedication to your learning journey.",
    50: "Fifty days consistent! You're building expertise that lasts.",
    100: "💯 CENTURY CLUB! 100 days of consistent learning - phenomenal achievement!"
  };

  if (MILESTONE_DAYS.includes(streak)) {
    return {
      atMilestone: true,
      milestone: streak,
      message: MESSAGES[streak],
    };
  }

  return { atMilestone: false, milestone: null, message: null };
}