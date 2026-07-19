export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StreakInfo {
  current: number;
  longest: number;
  reviewedToday: boolean;
  lastReviewDate: string | null;
}

export interface StreakUpdateInput {
  current: number;
  longest: number;
  lastReviewDate: string | null;
}

export function dayKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(a: Date, b: Date): number {
  const aKey = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bKey = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((aKey - bKey) / MS_PER_DAY);
}

export function uniqueDayKeys(dates: Array<Date | null | undefined>): string[] {
  const set = new Set<string>();
  for (const d of dates) {
    if (!d) continue;
    set.add(dayKey(new Date(d)));
  }
  return Array.from(set);
}

export function computeStreak(
  reviewDates: Array<Date | null | undefined>,
  now: Date = new Date()
): StreakInfo {
  const keys = uniqueDayKeys(reviewDates);
  if (keys.length === 0) {
    return { current: 0, longest: 0, reviewedToday: false, lastReviewDate: null };
  }

  const sortedAsc = Array.from(new Set(keys)).sort();
  const sortedDesc = [...sortedAsc].reverse();
  const today = dayKey(now);
  const reviewedToday = sortedDesc[0] === today;

  let current = 0;
  if (reviewedToday || daysBetween(now, new Date(sortedDesc[0])) === 1) {
    current = 1;
    for (let i = 0; i < sortedDesc.length - 1; i += 1) {
      const gap = daysBetween(new Date(sortedDesc[i]), new Date(sortedDesc[i + 1]));
      if (gap === 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  let longest = 1;
  let runLength = 1;
  for (let i = 1; i < sortedAsc.length; i += 1) {
    const gap = daysBetween(new Date(sortedAsc[i]), new Date(sortedAsc[i - 1]));
    if (gap === 1) {
      runLength += 1;
      if (runLength > longest) longest = runLength;
    } else {
      runLength = 1;
    }
  }
  if (current > longest) longest = current;

  return {
    current,
    longest,
    reviewedToday,
    lastReviewDate: sortedDesc[0] ?? null,
  };
}

/**
 * Apply a challenge completion streak boost.
 * Boosts the streak by 2 days instead of 1 (the "2x streak day" effect).
 */
export function applyChallengeCompletion(
  input: StreakUpdateInput,
  now: Date = new Date()
): StreakUpdateInput {
  // First application: today
  const afterFirst = applyStreakUpdate(input, now);
  // Second application: pretend it's tomorrow (effectively +2 days)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return applyStreakUpdate(afterFirst, tomorrow);
}

export function applyStreakUpdate(
  input: StreakUpdateInput,
  now: Date = new Date()
): StreakUpdateInput {
  const today = dayKey(now);

  if (input.lastReviewDate === today) {
    return input;
  }

  if (!input.lastReviewDate) {
    return { current: 1, longest: Math.max(input.longest, 1), lastReviewDate: today };
  }

  const gap = daysBetween(now, new Date(input.lastReviewDate));
  if (gap === 1) {
    const current = input.current + 1;
    return {
      current,
      longest: Math.max(input.longest, current),
      lastReviewDate: today,
    };
  }

  return { current: 1, longest: Math.max(input.longest, 1), lastReviewDate: today };
}
