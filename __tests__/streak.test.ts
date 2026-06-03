import {
  MS_PER_DAY,
  applyStreakUpdate,
  computeStreak,
  dayKey,
  daysBetween,
  uniqueDayKeys,
  type StreakUpdateInput,
} from "@/lib/learning/streak";

const date = (iso: string) => new Date(iso);

describe("dayKey", () => {
  it("returns YYYY-MM-DD in UTC", () => {
    expect(dayKey(date("2026-06-03T12:00:00Z"))).toBe("2026-06-03");
  });

  it("treats the same UTC day as the same key regardless of hours", () => {
    expect(dayKey(date("2026-06-03T01:00:00Z"))).toBe("2026-06-03");
    expect(dayKey(date("2026-06-03T23:59:00Z"))).toBe("2026-06-03");
  });

  it("rolls over at midnight UTC", () => {
    expect(dayKey(date("2026-06-03T23:59:00Z"))).toBe("2026-06-03");
    expect(dayKey(date("2026-06-04T00:01:00Z"))).toBe("2026-06-04");
  });
});

describe("daysBetween", () => {
  it("returns 0 for the same day", () => {
    expect(daysBetween(date("2026-06-03T10:00:00Z"), date("2026-06-03T22:00:00Z"))).toBe(0);
  });

  it("returns 1 for adjacent days", () => {
    expect(daysBetween(date("2026-06-04T01:00:00Z"), date("2026-06-03T20:00:00Z"))).toBe(1);
  });

  it("returns positive when a is later than b", () => {
    expect(daysBetween(date("2026-06-10T00:00:00Z"), date("2026-06-03T00:00:00Z"))).toBe(7);
  });
});

describe("uniqueDayKeys", () => {
  it("ignores null/undefined and de-duplicates by UTC day", () => {
    const result = uniqueDayKeys([
      date("2026-06-03T10:00:00Z"),
      date("2026-06-03T20:00:00Z"),
      null,
      undefined,
      date("2026-06-04T00:00:00Z"),
    ]);
    expect(result.sort()).toEqual(["2026-06-03", "2026-06-04"]);
  });

  it("returns [] for an all-null input", () => {
    expect(uniqueDayKeys([null, null, undefined])).toEqual([]);
  });
});

describe("computeStreak", () => {
  it("returns zero state for empty input", () => {
    expect(computeStreak([])).toEqual({
      current: 0,
      longest: 0,
      reviewedToday: false,
      lastReviewDate: null,
    });
  });

  it("detects a single review today as a 1-day streak", () => {
    const result = computeStreak([date("2026-06-03T15:00:00Z")], date("2026-06-03T20:00:00Z"));
    expect(result).toEqual({
      current: 1,
      longest: 1,
      reviewedToday: true,
      lastReviewDate: "2026-06-03",
    });
  });

  it("counts 3 consecutive days ending today as a 3-day current streak", () => {
    const result = computeStreak(
      [
        date("2026-06-01T15:00:00Z"),
        date("2026-06-02T15:00:00Z"),
        date("2026-06-03T15:00:00Z"),
      ],
      date("2026-06-03T20:00:00Z")
    );
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.reviewedToday).toBe(true);
  });

  it("keeps the streak active when last review was yesterday", () => {
    const result = computeStreak(
      [date("2026-06-01T15:00:00Z"), date("2026-06-02T15:00:00Z")],
      date("2026-06-03T20:00:00Z")
    );
    expect(result.current).toBe(2);
    expect(result.reviewedToday).toBe(false);
  });

  it("resets current to 0 when the last review is older than yesterday", () => {
    const result = computeStreak(
      [date("2026-05-30T15:00:00Z"), date("2026-05-31T15:00:00Z")],
      date("2026-06-03T20:00:00Z")
    );
    expect(result.current).toBe(0);
    expect(result.longest).toBe(2);
  });

  it("reports longest even when current is broken", () => {
    const result = computeStreak(
      [
        date("2026-05-20T15:00:00Z"),
        date("2026-05-21T15:00:00Z"),
        date("2026-05-22T15:00:00Z"),
        date("2026-05-23T15:00:00Z"),
        date("2026-06-01T15:00:00Z"),
      ],
      date("2026-06-03T20:00:00Z")
    );
    expect(result.current).toBe(0);
    expect(result.longest).toBe(4);
    expect(result.lastReviewDate).toBe("2026-06-01");
  });

  it("ignores non-consecutive days in the run", () => {
    const result = computeStreak(
      [
        date("2026-06-01T15:00:00Z"),
        date("2026-06-02T15:00:00Z"),
        date("2026-06-04T15:00:00Z"),
        date("2026-06-05T15:00:00Z"),
      ],
      date("2026-06-05T20:00:00Z")
    );
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });
});

describe("applyStreakUpdate", () => {
  const baseInput: StreakUpdateInput = { current: 0, longest: 0, lastReviewDate: null };

  it("starts at 1 for the first review ever", () => {
    const result = applyStreakUpdate(baseInput, date("2026-06-03T15:00:00Z"));
    expect(result).toEqual({
      current: 1,
      longest: 1,
      lastReviewDate: "2026-06-03",
    });
  });

  it("is a no-op when lastReviewDate is already today", () => {
    const input: StreakUpdateInput = {
      current: 3,
      longest: 5,
      lastReviewDate: "2026-06-03",
    };
    const result = applyStreakUpdate(input, date("2026-06-03T20:00:00Z"));
    expect(result).toBe(input);
  });

  it("increments current when last review was yesterday", () => {
    const result = applyStreakUpdate(
      { current: 4, longest: 4, lastReviewDate: "2026-06-02" },
      date("2026-06-03T10:00:00Z")
    );
    expect(result.current).toBe(5);
    expect(result.longest).toBe(5);
    expect(result.lastReviewDate).toBe("2026-06-03");
  });

  it("resets current to 1 when last review was older than yesterday", () => {
    const result = applyStreakUpdate(
      { current: 9, longest: 9, lastReviewDate: "2026-05-30" },
      date("2026-06-03T10:00:00Z")
    );
    expect(result.current).toBe(1);
    expect(result.longest).toBe(9);
    expect(result.lastReviewDate).toBe("2026-06-03");
  });
});

describe("MS_PER_DAY", () => {
  it("equals 86_400_000", () => {
    expect(MS_PER_DAY).toBe(86400000);
  });
});
