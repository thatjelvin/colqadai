import topicsData from "@/data/topics.json";

export type SubtopicNode = {
  slug: string;
  displayName: string;
};

export type TopicNode = {
  slug: string;
  displayName: string;
  subtopics: SubtopicNode[];
};

export type SubtopicLookupResult = {
  parentTopic: TopicNode;
  subtopic: SubtopicNode;
};

export const topicTaxonomy = topicsData as TopicNode[];

export function findSubtopicBySlug(slug: string): SubtopicLookupResult | null {
  for (const parentTopic of topicTaxonomy) {
    const subtopic = parentTopic.subtopics.find((item) => item.slug === slug);
    if (subtopic) {
      return {
        parentTopic,
        subtopic,
      };
    }
  }

  return null;
}

export function getAllSubtopics() {
  return topicTaxonomy.flatMap((parentTopic) =>
    parentTopic.subtopics.map((subtopic) => ({
      parentSlug: parentTopic.slug,
      parentDisplayName: parentTopic.displayName,
      ...subtopic,
    }))
  );
}
