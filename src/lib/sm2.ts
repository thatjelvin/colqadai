export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2State {
  easeFactor: number;   // EF, starts at 2.5
  interval: number;     // days
  repetitions: number;  // consecutive successful reviews
}

export interface SM2Result extends SM2State {
  nextReviewAt: Date;
}

export function calculateSM2(state: SM2State, rating: Rating, timeTakenSeconds?: number): SM2Result {
  const now = new Date();

  // Apply time penalty: if they took over 3 minutes, treat it as harder
  let finalRating = rating;
  if (finalRating > 3 && timeTakenSeconds && timeTakenSeconds > 180) {
    finalRating = (finalRating - 1) as Rating;
  }
  
  // If rating < 3 (failed recall), reset repetitions and interval
  if (finalRating < 3) {
    const newRepetitions = 0;
    const newInterval = 1;
    // Reduce ease factor but keep minimum of 1.3
    const newEaseFactor = Math.max(1.3, state.easeFactor - 0.2);
    
    const nextReviewAt = new Date(now);
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
    
    return {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      nextReviewAt,
    };
  }
  
  // Successful recall - apply SM-2 formula
  // Calculate new ease factor
  const newEaseFactor = Math.max(
    1.3,
    state.easeFactor + (0.1 - (5 - finalRating) * (0.08 + (5 - finalRating) * 0.02))
  );
  
  const newRepetitions = state.repetitions + 1;
  let newInterval: number;
  
  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(state.interval * newEaseFactor);
  }
  
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  
  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewAt,
  };
}

export function getStatusFromRepetitions(repetitions: number): "NEW" | "LEARNING" | "REVIEW" | "MASTERED" {
  if (repetitions === 0) return "NEW";
  if (repetitions <= 2) return "LEARNING";
  if (repetitions <= 5) return "REVIEW";
  return "MASTERED";
}
