import {
  BEGINNER_MASTERY_THRESHOLD,
  BEGINNER_PROBLEM_COUNT,
  BEGINNER_SESSION_THRESHOLD,
  MASTERY_PROBLEM_COUNT,
  BEGINNER_RATING_VALUES,
  MASTERY_RATING_VALUES,
  detectModeTransition,
  getReviewMode,
  problemCountForMode,
  shouldUseHints,
} from "@/lib/learning/reviewMode";

describe("reviewMode", () => {
  describe("getReviewMode", () => {
    it("returns beginner when sessionCount is below threshold", () => {
      expect(getReviewMode({ sessionCount: 0, masteryPercentage: 100 })).toBe("beginner");
      expect(getReviewMode({ sessionCount: 1, masteryPercentage: 100 })).toBe("beginner");
    });

    it("returns beginner when mastery is below threshold, regardless of session count", () => {
      expect(getReviewMode({ sessionCount: 5, masteryPercentage: 0 })).toBe("beginner");
      expect(getReviewMode({ sessionCount: 10, masteryPercentage: 29 })).toBe("beginner");
    });

    it("returns mastery once both thresholds are met", () => {
      expect(
        getReviewMode({ sessionCount: BEGINNER_SESSION_THRESHOLD, masteryPercentage: BEGINNER_MASTERY_THRESHOLD })
      ).toBe("mastery");
      expect(getReviewMode({ sessionCount: 5, masteryPercentage: 50 })).toBe("mastery");
      expect(getReviewMode({ sessionCount: 20, masteryPercentage: 90 })).toBe("mastery");
    });

    it("boundary: sessionCount at threshold and mastery at threshold is mastery", () => {
      expect(
        getReviewMode({
          sessionCount: BEGINNER_SESSION_THRESHOLD,
          masteryPercentage: BEGINNER_MASTERY_THRESHOLD,
        })
      ).toBe("mastery");
    });
  });

  describe("problemCountForMode", () => {
    it("returns 3 for beginner", () => {
      expect(problemCountForMode("beginner")).toBe(BEGINNER_PROBLEM_COUNT);
    });

    it("returns 6 for mastery", () => {
      expect(problemCountForMode("mastery")).toBe(MASTERY_PROBLEM_COUNT);
    });
  });

  describe("detectModeTransition", () => {
    it("returns transitioned=false on the first ever session", () => {
      expect(detectModeTransition(null, "beginner").transitioned).toBe(false);
      expect(detectModeTransition(null, "mastery").transitioned).toBe(false);
    });

    it("returns transitioned=false when mode has not changed", () => {
      expect(detectModeTransition("beginner", "beginner").transitioned).toBe(false);
      expect(detectModeTransition("mastery", "mastery").transitioned).toBe(false);
    });

    it("returns transitioned=true when mode changes from beginner to mastery", () => {
      const result = detectModeTransition("beginner", "mastery");
      expect(result.transitioned).toBe(true);
      expect(result.previousMode).toBe("beginner");
      expect(result.newMode).toBe("mastery");
    });

    it("returns transitioned=true when mode changes from mastery to beginner (regression)", () => {
      const result = detectModeTransition("mastery", "beginner");
      expect(result.transitioned).toBe(true);
      expect(result.previousMode).toBe("mastery");
      expect(result.newMode).toBe("beginner");
    });
  });

  describe("shouldUseHints", () => {
    it("is true for beginner", () => {
      expect(shouldUseHints("beginner")).toBe(true);
    });

    it("is false for mastery", () => {
      expect(shouldUseHints("mastery")).toBe(false);
    });
  });

  describe("rating value constants", () => {
    it("beginner scale covers 0-3 with 4 options", () => {
      expect(BEGINNER_RATING_VALUES).toEqual([0, 1, 2, 3]);
      expect(BEGINNER_RATING_VALUES).toHaveLength(4);
    });

    it("mastery scale covers 0-5 with 6 options", () => {
      expect(MASTERY_RATING_VALUES).toEqual([0, 1, 2, 3, 4, 5]);
      expect(MASTERY_RATING_VALUES).toHaveLength(6);
    });
  });
});
