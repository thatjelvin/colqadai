import {
  ratingToScore,
  bandForScore,
  trendFor,
  roundPct,
  parseRating,
  extractRatingsFromAnalytics,
  computeProblemRatingScore,
  normalizeTopicSlug,
} from "@/lib/learning/mastery-pure";

describe("Mastery pure functions", () => {
  describe("ratingToScore", () => {
    it("maps 5/5 to 1.0 (perfect recall)", () => {
      expect(ratingToScore(5)).toBe(1.0);
    });
    it("maps 4/5 to 0.85 (good recall)", () => {
      expect(ratingToScore(4)).toBe(0.85);
    });
    it("maps 3/5 to 0.6 (passing recall)", () => {
      expect(ratingToScore(3)).toBe(0.6);
    });
    it("maps 2/5 to 0.35 (struggling)", () => {
      expect(ratingToScore(2)).toBe(0.35);
    });
    it("maps 0/5 to 0 (failed)", () => {
      expect(ratingToScore(0)).toBe(0);
    });
  });

  describe("bandForScore", () => {
    it("returns 'none' when no data", () => {
      expect(bandForScore(0, false)).toBe("none");
    });
    it("returns 'mastered' at >= 0.85", () => {
      expect(bandForScore(0.9, true)).toBe("mastered");
    });
    it("returns 'proficient' at >= 0.65 and < 0.85", () => {
      expect(bandForScore(0.7, true)).toBe("proficient");
    });
    it("returns 'developing' at >= 0.4 and < 0.65", () => {
      expect(bandForScore(0.5, true)).toBe("developing");
    });
    it("returns 'novice' below 0.4", () => {
      expect(bandForScore(0.2, true)).toBe("novice");
    });
  });

  describe("trendFor", () => {
    it("returns 'unknown' with fewer than 2 ratings", () => {
      expect(trendFor([])).toBe("unknown");
      expect(trendFor([3])).toBe("unknown");
    });
    it("detects improving trend when recent half is much higher", () => {
      const ratings = [2, 2, 4, 5];
      expect(trendFor(ratings)).toBe("improving");
    });
    it("detects declining trend when recent half is much lower", () => {
      const ratings = [5, 5, 2, 1];
      expect(trendFor(ratings)).toBe("declining");
    });
    it("returns stable when ratings are consistent", () => {
      const ratings = [4, 4, 4, 4];
      expect(trendFor(ratings)).toBe("stable");
    });
  });

  describe("roundPct", () => {
    it("clamps negative values to 0", () => {
      expect(roundPct(-0.5)).toBe(0);
    });
    it("clamps values above 1 to 100", () => {
      expect(roundPct(1.5)).toBe(100);
    });
    it("rounds to nearest integer percent", () => {
      expect(roundPct(0.856)).toBe(86);
      expect(roundPct(0.123)).toBe(12);
    });
    it("returns 0 for non-finite values", () => {
      expect(roundPct(NaN)).toBe(0);
      expect(roundPct(Infinity)).toBe(0);
    });
  });

  describe("parseRating", () => {
    it("returns null for non-object input", () => {
      expect(parseRating(null)).toBeNull();
      expect(parseRating("string")).toBeNull();
      expect(parseRating(42)).toBeNull();
    });
    it("returns null when missing required fields", () => {
      expect(parseRating({ rating: 4 })).toBeNull();
      expect(parseRating({ problemId: "p1" })).toBeNull();
    });
    it("returns a valid RatingEntry", () => {
      const entry = parseRating({
        problemId: "p1",
        rating: 4,
        createdAt: "2026-06-01T10:00:00Z",
      });
      expect(entry).not.toBeNull();
      expect(entry!.problemId).toBe("p1");
      expect(entry!.rating).toBe(4);
      expect(entry!.createdAt).toBeGreaterThan(0);
    });
  });

  describe("extractRatingsFromAnalytics", () => {
    it("returns [] for null/undefined aggregate", () => {
      expect(extractRatingsFromAnalytics(null)).toEqual([]);
      expect(extractRatingsFromAnalytics(undefined)).toEqual([]);
    });
    it("extracts from direct ratings array", () => {
      const ratings = extractRatingsFromAnalytics({
        ratings: [
          { problemId: "p1", rating: 4, createdAt: "2026-06-01T10:00:00Z" },
          { problemId: "p2", rating: 5, createdAt: "2026-06-02T10:00:00Z" },
        ],
      });
      expect(ratings).toHaveLength(2);
      expect(ratings[0]?.problemId).toBe("p1");
    });
    it("extracts from events array when ratings not present", () => {
      const ratings = extractRatingsFromAnalytics({
        events: [
          { problemId: "p1", rating: 3, createdAt: "2026-06-01T10:00:00Z" },
        ],
      });
      expect(ratings).toHaveLength(1);
      expect(ratings[0]?.rating).toBe(3);
    });
  });

  describe("computeProblemRatingScore", () => {
    it("returns 0 when no ratings", () => {
      expect(computeProblemRatingScore([])).toBe(0);
    });
    it("weights recent ratings more heavily than older ones", () => {
      const oldBadThenNewGood: { problemId: string; rating: number; createdAt: number }[] = [
        { problemId: "p1", rating: 1, createdAt: 1 },
        { problemId: "p1", rating: 1, createdAt: 2 },
        { problemId: "p1", rating: 1, createdAt: 3 },
        { problemId: "p1", rating: 5, createdAt: 4 },
        { problemId: "p1", rating: 5, createdAt: 5 },
        { problemId: "p1", rating: 5, createdAt: 6 },
      ];
      const score = computeProblemRatingScore(oldBadThenNewGood);
      const simpleAvg = oldBadThenNewGood.reduce((s, r) => s + r.rating, 0) / 6;
      expect(score).toBeGreaterThan(simpleAvg / 5);
    });
  });

  describe("normalizeTopicSlug", () => {
    it("returns 'general' for null/undefined/empty", () => {
      expect(normalizeTopicSlug(null)).toBe("general");
      expect(normalizeTopicSlug(undefined)).toBe("general");
      expect(normalizeTopicSlug("")).toBe("general");
    });
    it("returns the slug as-is when present", () => {
      expect(normalizeTopicSlug("calculus")).toBe("calculus");
    });
  });
});
