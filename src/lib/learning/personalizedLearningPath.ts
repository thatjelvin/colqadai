import { db } from "@/lib/db";
import { getPrerequisiteSlugs, PREREQUISITES } from "@/data/prerequisites";
import { LEARNING_FEATURES, isFeatureEnabled } from "@/lib/learning/featureFlags";
import { computeTopicMasteryForUser } from "@/lib/learning/mastery";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import type { TopicMastery } from "@/lib/learning/mastery-types";

/**
 * Personalized Learning Path Service
 * Generates a customized learning sequence based on user data
 */

export interface LearningPathNode {
  id: string; // topic slug
  title: string;
  description: string;
  prerequisites: string[];
  estimatedTime: number; // in minutes
  difficulty: 1 | 2 | 3 | 4 | 5;
  mastery: number; // 0-100
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  reason: string; // Why this is recommended next
  order: number;
}

export interface LearningPath {
  id: string;
  userId: string;
  nodes: LearningPathNode[];
  generatedAt: Date;
  learningPace: 'relaxed' | 'balanced' | 'intensive';
  goal: string;
}

/**
 * Get all available topics from the topics.json file
 */
async function getAllTopics(): Promise<string[]> {
  // Import the topics data
  const topicsData = await import("@/data/topics.json");

  // Extract all subtopic slugs
  const allTopics: string[] = [];
  topicsData.default.forEach((mainTopic: any) => {
    mainTopic.subtopics.forEach((subtopic: any) => {
      allTopics.push(subtopic.slug);
    });
  });

  return allTopics;
}

/**
 * Get topic display name from slug
 */
function getTopicDisplayName(slug: string): string {
  const topicsData = require("@/data/topics.json").default;

  for (const mainTopic of topicsData) {
    const subtopic = mainTopic.subtopics.find((st: any) => st.slug === slug);
    if (subtopic) {
      return subtopic.displayName;
    }

    // Also check if it's a main topic
    if (mainTopic.slug === slug) {
      return mainTopic.displayName;
    }
  }

  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get topic description from slug
 */
function getTopicDescription(slug: string): string {
  // Basic descriptions - in a real app, these would come from a database or content CMS
  const descriptions: Record<string, string> = {
    "limits-continuity": "Understand the concept of limits and continuous functions, foundation for calculus",
    "differential-calculus": "Learn derivatives and their applications to rates of change and optimization",
    "integral-calculus": "Master integrals and their applications to area, volume, and accumulation",
    "multivariable-calculus": "Extend calculus to functions of multiple variables",
    "series-sequences": "Study infinite sequences and series, convergence tests, and power series",
    "vectors-vector-spaces": "Learn about vectors, vector spaces, and linear combinations",
    "matrices-determinants": "Matrix operations, determinants, and their properties",
    "linear-transformations": "Understand linear transformations and their matrix representations",
    "eigenvalues-eigenvectors": "Study eigenvalues, eigenvectors, and diagonalization",
    "inner-product-spaces": "Explore inner product spaces, orthogonality, and spectral theory",
    // Add more descriptions as needed
  };

  return descriptions[slug] || `Learn about ${slug.replace(/-/g, " ")}`;
}

/**
 * Estimate time needed for a topic based on difficulty and user's learning pace
 */
function estimateTimeForTopic(difficulty: number, pace: 'relaxed' | 'balanced' | 'intensive'): number {
  // Base time in minutes
  let baseTime = 60; // 1 hour baseline

  // Adjust by difficulty (1-5 scale)
  baseTime *= difficulty;

  // Adjust by pace
  switch (pace) {
    case 'relaxed':
      baseTime *= 1.5; // Take 50% more time
      break;
    case 'intensive':
      baseTime *= 0.7; // Take 30% less time
      break;
    case 'balanced':
    default:
      // No adjustment
      break;
  }

  return Math.max(30, Math.round(baseTime)); // Minimum 30 minutes
}

/**
 * Determine topic difficulty based on prerequisites and user's diagnostic
 */
function determineTopicDifficulty(
  topicSlug: string,
  allPrereqs: string[],
  diagnosticDifficulty: number | null,
  userMastery: Map<string, number>
): number {
  // Start with diagnostic difficulty or default to 3
  let difficulty = diagnosticDifficulty ?? 3;

  // Adjust based on prerequisites count
  const prereqCount = allPrereqs.length;
  if (prereqCount > 3) {
    difficulty = Math.min(5, difficulty + 1);
  } else if (prereqCount === 0) {
    difficulty = Math.max(1, difficulty - 1);
  }

  // Adjust based on user's mastery of prerequisites
  let readyPrereqs = 0;
  for (const prereq of allPrereqs) {
    const mastery = userMastery.get(prereq) ?? 0;
    if (mastery >= 70) {
      readyPrereqs++;
    }
  }

  const readinessRatio = readyPrereqs / Math.max(1, allPrereqs.length);
  if (readinessRatio < 0.5) {
    // Not ready for this topic yet
    difficulty = Math.min(5, difficulty + 1);
  } else if (readinessRatio > 0.8) {
    // Well prepared
    difficulty = Math.max(1, difficulty - 1);
  }

  return Math.max(1, Math.min(5, difficulty));
}

/**
 * Generate a personalized learning path for a user
 */
export async function generatePersonalizedLearningPath(userId: string): Promise<LearningPath> {
  // Check if feature is enabled
  const featureEnabled = await isFeatureEnabled(LEARNING_FEATURES.PERSONALIZED_LEARNING_PATH);
  if (!featureEnabled) {
    throw new Error("Personalized learning path feature is disabled");
  }

  // Get user data
  const dbUser = await getOrCreateUserForSupabaseId(userId, "", "", "");

  // Get all topics
  const allTopics = await getAllTopics();

  // Get user's current mastery for all topics
  const userMasteryMap = new Map<string, number>();
  for (const topic of allTopics) {
    try {
      const mastery = await computeTopicMasteryForUser(userId, topic);
      userMasteryMap.set(topic, mastery.masteryPercentage);
    } catch (error) {
      console.warn(`Failed to compute mastery for topic ${topic}:`, error);
      userMasteryMap.set(topic, 0); // Default to 0 if calculation fails
    }
  }

  // Determine learning pace and goal from user profile
  const learningPace = (dbUser.pace as 'relaxed' | 'balanced' | 'intensive') || 'balanced';
  const goal = dbUser.goal || 'Self-study';

  // Get diagnostic data if available
  const diagnosticScore = dbUser.diagnostic_score ?? 5; // Default to middle
  const diagnosticDifficulty = dbUser.difficulty_level ?? 3; // Default to medium
  const recommendedTopic = dbUser.recommended_topic ?? "limits-continuity"; // Default starting point

  // Generate learning path nodes
  const nodes: LearningPathNode[] = [];

  // First, identify which topics are available (prereqs met)
  const availableTopics: string[] = [];
  const lockedTopics: string[] = [];

  for (const topic of allTopics) {
    const prereqs = getPrerequisiteSlugs(topic);
    let allPrereqsMet = true;

    for (const prereq of prereqs) {
      const prereqMastery = userMasteryMap.get(prereq) ?? 0;
      if (prereqMastery < 70) { // Need 70% mastery to consider prerequisite met
        allPrereqsMet = false;
        break;
      }
    }

    if (allPrereqsMet || prereqs.length === 0) {
      availableTopics.push(topic);
    } else {
      lockedTopics.push(topic);
    }
  }

  // Sort available topics by recommended order
  // Start with the recommended topic from diagnostic, then by mastery gaps
  const sortedAvailable = [...availableTopics].sort((a, b) => {
    // Prioritize the recommended topic
    if (a === recommendedTopic) return -1;
    if (b === recommendedTopic) return 1;

    // Then by lowest mastery first (what they need to work on most)
    const masteryA = userMasteryMap.get(a) ?? 0;
    const masteryB = userMasteryMap.get(b) ?? 0;
    return masteryA - masteryB;
  });

  // Create nodes for all topics
  let order = 1;

  // First add available topics in recommended order
  for (const topic of sortedAvailable) {
    const prereqs = getPrerequisiteSlugs(topic);
    const mastery = userMasteryMap.get(topic) ?? 0;

    // Determine if this should be the next recommended topic
    let isNextRecommended = false;
    let reason = "";

    if (topic === recommendedTopic && mastery < 70) {
      isNextRecommended = true;
      reason = "Recommended starting point based on your diagnostic";
    } else if (mastery < 70) {
      // Check if prereqs are met
      const allPrereqsMet = prereqs.every(p => (userMasteryMap.get(p) ?? 0) >= 70);
      if (allPrereqsMet) {
        isNextRecommended = true;
        reason = "All prerequisites completed - ready to start";
      } else {
        const unmetPrereqs = prereqs.filter(p => (userMasteryMap.get(p) ?? 0) < 70);
        reason = `Prerequisites needed: ${unmetPrereqs.join(", ")}`;
      }
    } else {
      reason = "Completed - mastery achieved";
    }

    const difficulty = determineTopicDifficulty(
      topic,
      prereqs,
      diagnosticDifficulty,
      userMasteryMap
    );

    nodes.push({
      id: topic,
      title: getTopicDisplayName(topic),
      description: getTopicDescription(topic),
      prerequisites: prereqs,
      estimatedTime: estimateTimeForTopic(difficulty, learningPace),
      difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
      mastery: Math.round(mastery),
      status: mastery >= 70 ? 'completed' :
              (isNextRecommended ? 'available' : 'locked'),
      reason,
      order: order++
    });
  }

  // Then add locked topics (those with unmet prerequisites)
  for (const topic of lockedTopics) {
    const prereqs = getPrerequisiteSlugs(topic);
    const mastery = userMasteryMap.get(topic) ?? 0;

    // Find which prerequisites are unmet
    const unmetPrereqs = prereqs.filter(p => (userMasteryMap.get(p) ?? 0) < 70);

    let reason = "";
    if (unmetPrereqs.length === prereqs.length) {
      reason = "No prerequisites met yet";
    } else if (unmetPrereqs.length > 0) {
      reason = `Prerequisites needed: ${unmetPrereqs.join(", ")}`;
    } else {
      reason = "All prerequisites met";
    }

    const difficulty = determineTopicDifficulty(
      topic,
      prereqs,
      diagnosticDifficulty,
      userMasteryMap
    );

    nodes.push({
      id: topic,
      title: getTopicDisplayName(topic),
      description: getTopicDescription(topic),
      prerequisites: prereqs,
      estimatedTime: estimateTimeForTopic(difficulty, learningPace),
      difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
      mastery: Math.round(mastery),
      status: 'locked',
      reason,
      order: order++
    });
  }

  // Sort final nodes by order
  nodes.sort((a, b) => a.order - b.order);

  // Re-assign order numbers
  nodes.forEach((node, index) => {
    node.order = index + 1;
  });

  return {
    id: `path-${userId}-${Date.now()}`,
    userId,
    nodes,
    generatedAt: new Date(),
    learningPace,
    goal
  };
}

/**
 * Get the next recommended topic for a user based on their learning path
 */
export async function getNextRecommendedTopic(userId: string): Promise<{
  topic: string;
  reason: string;
  mastery: number;
} | null> {
  try {
    const path = await generatePersonalizedLearningPath(userId);

    // Find the first available or in-progress topic
    for (const node of path.nodes) {
      if (node.status === 'available' || node.status === 'in-progress') {
        return {
          topic: node.id,
          reason: node.reason,
          mastery: node.mastery
        };
      }
    }

    // If no available topics, return the first locked one with best reason
    const lockedNodes = path.nodes.filter(node => node.status === 'locked');
    if (lockedNodes.length > 0) {
      // Find the one with the most positive reason (closest to being available)
      const bestLocked = lockedNodes.reduce((prev, current) => {
        const prevScore = (prev.reason.match(/Prerequisites needed/) || []).length;
        const currScore = (current.reason.match(/Prerequisites needed/) || []).length;
        return prevScore < currScore ? prev : current;
      });

      return {
        topic: bestLocked.id,
        reason: bestLocked.reason,
        mastery: bestLocked.mastery
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to get next recommended topic:", error);
    return null;
  }
}