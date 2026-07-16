/**
 * Find the "next recommended topic" based on prerequisites + current mastery.
 *
 * Strategy:
 * 1. Find all topics that have unmet (or partially met) prerequisites
 * 2. Among those, find topics whose prerequisites are all mastered (≥70%)
 * 3. Sort by number of mastered prerequisites (most ready first)
 * 4. Fall back to unstarted topics with no prerequisites
 */

import { getPrerequisiteSlugs, PREREQUISITES } from "@/data/prerequisites";

export interface TopicMasteryInfo {
  slug: string;
  masteryPercentage: number;
  band: "none" | "novice" | "developing" | "proficient" | "mastered";
}

const READY_THRESHOLD = 70;

function isReady(mastery: TopicMasteryInfo[] | Map<string, TopicMasteryInfo>, slug: string): boolean {
  const map = mastery instanceof Map ? mastery : new Map(mastery.map((m) => [m.slug, m]));
  const info = map.get(slug);
  return info ? info.masteryPercentage >= READY_THRESHOLD : false;
}

function getMasteryMap(
  mastery: TopicMasteryInfo[] | Map<string, TopicMasteryInfo>
): Map<string, TopicMasteryInfo> {
  return mastery instanceof Map ? mastery : new Map(mastery.map((m) => [m.slug, m]));
}

export function findNextTopic(
  allSlugs: string[],
  mastery: TopicMasteryInfo[] | Map<string, TopicMasteryInfo>
): { slug: string; reason: string } | null {
  const map = getMasteryMap(mastery);

  // Find topics whose prerequisites are all met but the topic itself has low mastery
  const candidates: Array<{ slug: string; readyPrereqs: number; totalPrereqs: number; reason: string }> = [];

  for (const slug of allSlugs) {
    const prereqs = getPrerequisiteSlugs(slug);
    if (prereqs.length === 0) continue;

    const topicInfo = map.get(slug);
    const topicMastery = topicInfo?.masteryPercentage ?? 0;
    if (topicMastery >= READY_THRESHOLD) continue; // Already mastered

    const readyCount = prereqs.filter((p) => isReady(map, p)).length;
    if (readyCount === prereqs.length) {
      // All prerequisites met — this is the top candidate
      candidates.push({
        slug,
        readyPrereqs: readyCount,
        totalPrereqs: prereqs.length,
        reason: `All prerequisites completed`,
      });
    } else if (readyCount > 0) {
      candidates.push({
        slug,
        readyPrereqs: readyCount,
        totalPrereqs: prereqs.length,
        reason: `${readyCount}/${prereqs.length} prerequisites completed`,
      });
    }
  }

  candidates.sort((a, b) => {
    // All prereqs met first
    if (a.readyPrereqs === a.totalPrereqs && b.readyPrereqs !== b.totalPrereqs) return -1;
    if (b.readyPrereqs === b.totalPrereqs && a.readyPrereqs !== a.totalPrereqs) return 1;
    // Then by ratio of completed prereqs
    const aRatio = a.totalPrereqs > 0 ? a.readyPrereqs / a.totalPrereqs : 0;
    const bRatio = b.totalPrereqs > 0 ? b.readyPrereqs / b.totalPrereqs : 0;
    return bRatio - aRatio;
  });

  if (candidates.length > 0) {
    const top = candidates[0];
    return { slug: top.slug, reason: top.reason };
  }

  // Fallback: pick an unstarted topic with no prerequisites
  const unstarted = allSlugs.filter((slug) => {
    const info = map.get(slug);
    return (info?.masteryPercentage ?? 0) === 0 && getPrerequisiteSlugs(slug).length === 0;
  });

  if (unstarted.length > 0) {
    return { slug: unstarted[0], reason: "New topic — no prerequisites needed" };
  }

  return null;
}

/**
 * Get a mapping of which topics depend on a given topic (reverse prerequisite).
 * Useful for showing "unlocks" when a topic is mastered.
 */
export function getUnlockedTopics(topicSlug: string): string[] {
  return Object.entries(PREREQUISITES)
    .filter(([, prereqs]) => prereqs.includes(topicSlug))
    .map(([topic]) => topic);
}
