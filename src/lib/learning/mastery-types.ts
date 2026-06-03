export type TopicMastery = {
  topicSlug: string;
  totalProblems: number;
  attemptedProblems: number;
  masteryScore: number;
  masteryPercentage: number;
  averageRating: number | null;
  averageFirstTryRate: number;
  recentRatingTrend: "improving" | "stable" | "declining" | "unknown";
  band: "none" | "novice" | "developing" | "proficient" | "mastered";
};

export type OverallMastery = {
  masteryPercentage: number;
  attemptedCount: number;
  totalProblems: number;
};
