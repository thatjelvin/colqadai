import { createServerClient } from "@/lib/supabase/server";

export type TopicProgressRecord = {
  reviewCount: number;
  masteryPercent: number;
};

type UserTopicProgressRow = {
  topic_slug: string;
  review_count: number | null;
  mastery_percent: number | null;
};

export async function getUserTopicProgressBySlug(userId: string): Promise<Record<string, TopicProgressRecord>> {
  const supabase = createServerClient();
  const { data: progressRows, error } = await supabase
    .from("user_topic_progress")
    .select("topic_slug, review_count, mastery_percent")
    .eq("user_id", userId);

  if (error) {
    console.warn("Failed to fetch topic progress", error);
  }

  return ((progressRows ?? []) as UserTopicProgressRow[]).reduce(
    (acc, row) => {
      acc[row.topic_slug] = {
        reviewCount: row.review_count ?? 0,
        masteryPercent: row.mastery_percent ?? 0,
      };
      return acc;
    },
    {} as Record<string, TopicProgressRecord>
  );
}
