import type { TopicMastery } from "./mastery-types";

export const RATING_PROBLEM_SCORE = 0.7;
export const FIRST_TRY_PROBLEM_SCORE = 0.3;
export const RECENT_WEIGHT = 0.6;
export const HISTORY_WEIGHT = 0.4;
export const MIN_RATINGS_FOR_BAND = 1;

export function normalizeTopicSlug(slug: string | null | undefined): string {
  if (!slug) return "general";
  return slug;
}

export function ratingToScore(rating: number): number {
  if (rating >= 5) return 1.0;
  if (rating >= 4) return 0.85;
  if (rating >= 3) return 0.6;
  if (rating >= 2) return 0.35;
  if (rating >= 1) return 0.15;
  return 0;
}

export function bandForScore(score: number, hasData: boolean): TopicMastery["band"] {
  if (!hasData) return "none";
  if (score >= 0.85) return "mastered";
  if (score >= 0.65) return "proficient";
  if (score >= 0.4) return "developing";
  return "novice";
}

export function trendFor(ratings: number[]): TopicMastery["recentRatingTrend"] {
  if (ratings.length < 2) return "unknown";
  const half = Math.floor(ratings.length / 2);
  const recent = ratings.slice(half);
  const earlier = ratings.slice(0, half);
  if (recent.length === 0 || earlier.length === 0) return "unknown";
  const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, r) => sum + r, 0) / earlier.length;
  const delta = recentAvg - earlierAvg;
  if (delta > 0.4) return "improving";
  if (delta < -0.4) return "declining";
  return "stable";
}

export function roundPct(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

export type RatingEntry = { problemId: string; rating: number; createdAt: number };

export function parseRating(entry: unknown): RatingEntry | null {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as Record<string, unknown>;
  const rating = typeof e.rating === "number" ? e.rating : null;
  const problemId = typeof e.problemId === "string" ? e.problemId : null;
  const createdAt = typeof e.createdAt === "string"
    ? new Date(e.createdAt).getTime()
    : Date.now();
  if (rating === null || !problemId) return null;
  return { problemId, rating, createdAt };
}

export function extractRatingsFromAnalytics(aggregate: unknown): RatingEntry[] {
  if (!aggregate || typeof aggregate !== "object") return [];
  const agg = aggregate as Record<string, unknown>;
  const direct = Array.isArray(agg.ratings)
    ? (agg.ratings as unknown[]).map(parseRating).filter(notNull)
    : [];
  if (direct.length > 0) return direct;

  const events = Array.isArray(agg.events) ? (agg.events as unknown[]) : [];
  return events
    .map((event) => {
      if (!event || typeof event !== "object") return null;
      const e = event as Record<string, unknown>;
      const rating = typeof e.rating === "number" ? e.rating : null;
      const problemId = typeof e.problemId === "string" ? e.problemId : null;
      const createdAt = typeof e.createdAt === "string"
        ? new Date(e.createdAt).getTime()
        : Date.now();
      if (rating === null || !problemId) return null;
      return { problemId, rating, createdAt };
    })
    .filter(notNull);
}

function notNull<T>(value: T | null): value is T {
  return value !== null;
}

export function computeProblemRatingScore(ratings: RatingEntry[]): number {
  if (ratings.length === 0) return 0;

  const sorted = [...ratings].sort((a, b) => a.createdAt - b.createdAt);
  const recent = sorted.slice(-3);
  const earlier = sorted.slice(0, Math.max(0, sorted.length - recent.length));

  const recentScore = recent.reduce((sum, r) => sum + ratingToScore(r.rating), 0) / recent.length;
  const earlierScore = earlier.length > 0
    ? earlier.reduce((sum, r) => sum + ratingToScore(r.rating), 0) / earlier.length
    : recentScore;

  return recentScore * RECENT_WEIGHT + earlierScore * HISTORY_WEIGHT;
}
