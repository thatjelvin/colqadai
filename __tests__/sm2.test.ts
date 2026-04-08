import { calculateSM2, getStatusFromRepetitions, SM2State } from "@/lib/sm2";

describe("SM-2 Algorithm", () => {
  const initialState: SM2State = {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
  };

  describe("First review at each rating", () => {
    it("should reset on rating 0 (Again)", () => {
      const result = calculateSM2(initialState, 0);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.3); // 2.5 - 0.2
    });

    it("should reset on rating 1 (Hard)", () => {
      const result = calculateSM2(initialState, 1);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.3);
    });

    it("should reset on rating 2 (Failed)", () => {
      const result = calculateSM2(initialState, 2);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.3);
    });

    it("should progress on rating 3 (Good)", () => {
      const result = calculateSM2(initialState, 3);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      // EF = 2.5 + (0.1 - (5-3) * (0.08 + (5-3) * 0.02))
      // EF = 2.5 + (0.1 - 2 * (0.08 + 0.04))
      // EF = 2.5 + (0.1 - 2 * 0.12)
      // EF = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
      expect(result.easeFactor).toBeCloseTo(2.36, 2);
    });

    it("should progress more on rating 4", () => {
      const result = calculateSM2(initialState, 4);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      // EF = 2.5 + (0.1 - 1 * (0.08 + 0.02)) = 2.5 + 0 = 2.5
      expect(result.easeFactor).toBe(2.5);
    });

    it("should progress most on rating 5 (Easy)", () => {
      const result = calculateSM2(initialState, 5);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      // EF = 2.5 + (0.1 - 0) = 2.6
      expect(result.easeFactor).toBe(2.6);
    });
  });

  describe("Failed review resetting state", () => {
    it("should reset after successful reviews then failure", () => {
      // First, get to 3 repetitions
      let state = calculateSM2(initialState, 5); // rep=1, int=1
      state = calculateSM2(state, 5); // rep=2, int=6
      state = calculateSM2(state, 5); // rep=3, int=6*2.6=16
      
      expect(state.repetitions).toBe(3);
      expect(state.interval).toBeGreaterThan(10);
      
      // Now fail
      const failedState = calculateSM2(state, 1);
      expect(failedState.repetitions).toBe(0);
      expect(failedState.interval).toBe(1);
    });
  });

  describe("EF floor clamping", () => {
    it("should not let ease factor go below 1.3", () => {
      const lowEFState: SM2State = {
        easeFactor: 1.35,
        interval: 10,
        repetitions: 5,
      };
      
      const result = calculateSM2(lowEFState, 0);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("should maintain minimum ease factor of 1.3 even with multiple failures", () => {
      let state: SM2State = { ...initialState };
      
      // Fail multiple times
      for (let i = 0; i < 10; i++) {
        state = calculateSM2(state, 0);
      }
      
      expect(state.easeFactor).toBe(1.3);
    });
  });

  describe("Interval progression over multiple Good reviews", () => {
    it("should follow the expected interval progression", () => {
      let state = calculateSM2(initialState, 3); // rep=1, int=1
      expect(state.repetitions).toBe(1);
      expect(state.interval).toBe(1);
      
      state = calculateSM2(state, 3); // rep=2, int=6
      expect(state.repetitions).toBe(2);
      expect(state.interval).toBe(6);
      
      state = calculateSM2(state, 3); // rep=3, int=6*EF
      expect(state.repetitions).toBe(3);
      expect(state.interval).toBeGreaterThan(6);
      
      const previousInterval = state.interval;
      state = calculateSM2(state, 3); // rep=4
      expect(state.repetitions).toBe(4);
      expect(state.interval).toBeGreaterThan(previousInterval);
    });
  });

  describe("nextReviewAt calculation", () => {
    it("should set next review date correctly", () => {
      const before = new Date();
      const result = calculateSM2(initialState, 3);
      const after = new Date();
      
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + result.interval);
      
      expect(result.nextReviewAt.getDate()).toBe(expectedDate.getDate());
    });
  });

  describe("getStatusFromRepetitions", () => {
    it("should return NEW for 0 repetitions", () => {
      expect(getStatusFromRepetitions(0)).toBe("NEW");
    });

    it("should return LEARNING for 1-2 repetitions", () => {
      expect(getStatusFromRepetitions(1)).toBe("LEARNING");
      expect(getStatusFromRepetitions(2)).toBe("LEARNING");
    });

    it("should return REVIEW for 3-5 repetitions", () => {
      expect(getStatusFromRepetitions(3)).toBe("REVIEW");
      expect(getStatusFromRepetitions(4)).toBe("REVIEW");
      expect(getStatusFromRepetitions(5)).toBe("REVIEW");
    });

    it("should return MASTERED for 6+ repetitions", () => {
      expect(getStatusFromRepetitions(6)).toBe("MASTERED");
      expect(getStatusFromRepetitions(10)).toBe("MASTERED");
    });
  });
});
