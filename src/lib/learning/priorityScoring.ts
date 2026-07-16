/**
 * Priority scoring for the review queue.
 *
 * Score = (overdueDays × 1.5 + 1) × (2.5 - easeFactor) × difficultyMultiplier
 *
 * Higher score = more urgent. Overdue items get a multiplier, low ease factors
 * (struggling) get a boost, and harder problems score higher.
 */

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  EASY: 0.8,
  MEDIUM: 1.0,
  HARD: 1.3,
};

export interface ScoredItem {
  id: string;
  title: string;
  topicTag: string | null;
  topicSlug: string | null;
  topicName: string;
  kind: "due" | "new";
  nextReviewAt: Date | null;
  priorityScore: number;
  overdueDays: number;
  easeFactor: number;
  difficulty: Difficulty;
}

export function computePriorityScore(input: {
  overdueDays: number;
  easeFactor: number;
  difficulty: Difficulty;
}): number {
  const overdueWeight = input.overdueDays * 1.5 + 1;
  const easePenalty = 2.5 - input.easeFactor;
  const diffMult = DIFFICULTY_MULTIPLIER[input.difficulty] ?? 1.0;
  return Math.round(overdueWeight * Math.max(0.1, easePenalty) * diffMult * 100);
}

export function getOverdueDays(nextReviewAt: Date | null): number {
  if (!nextReviewAt) return 0;
  const now = Date.now();
  const due = nextReviewAt.getTime();
  if (due >= now) return 0;
  return Math.max(1, Math.floor((now - due) / 86_400_000));
}

export function sortByPriority<T extends ScoredItem>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Get a human-readable urgency label and color.
 */
export function getUrgencyLabel(overdueDays: number, dueAt: Date | null): {
  label: string;
  color: string;
} {
  if (overdueDays > 14) return { label: "Critical", color: "text-red-600" };
  if (overdueDays > 7) return { label: "Overdue", color: "text-orange-500" };
  if (overdueDays > 3) return { label: "Late", color: "text-amber-500" };
  if (overdueDays > 0) return { label: "Due", color: "text-yellow-500" };
  if (!dueAt) return { label: "New", color: "text-green-500" };
  const daysUntil = Math.ceil((dueAt.getTime() - Date.now()) / 86_400_000);
  if (daysUntil <= 1) return { label: "Tomorrow", color: "text-blue-400" };
  if (daysUntil <= 3) return { label: `${daysUntil} days`, color: "text-blue-500" };
  if (daysUntil <= 7) return { label: `${daysUntil} days`, color: "text-slate-500" };
  return { label: `${daysUntil} days`, color: "text-slate-400" };
}

export function getForecastLabel(nextReviewAt: Date | null): string {
  if (!nextReviewAt) return "New — not yet reviewed";
  const now = Date.now();
  const due = nextReviewAt.getTime();
  const diffMs = due - now;
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays < -1) return `Overdue by ${Math.abs(diffDays)} days`;
  if (diffDays < 0) return "Due today";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}
