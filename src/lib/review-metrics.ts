export const GOT_IT_POINTS = 100;
export const ALMOST_POINTS = 50;

export const HIGH_MASTERY_PERCENT = 80;
export const MEDIUM_MASTERY_PERCENT = 50;
export const GAP_RATE_THRESHOLD_PERCENT = 40;

export const MIN_SUMMARY_CHAPTERS = 2;
export const MAX_SUMMARY_CHAPTERS = 3;

export function calculateMasteryPercent(gotIt: number, almost: number, total: number) {
  if (total === 0) return 0;
  const earnedPoints = gotIt * GOT_IT_POINTS + almost * ALMOST_POINTS;
  return Math.round((earnedPoints / (total * GOT_IT_POINTS)) * 100);
}
