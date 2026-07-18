import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Increment the count of conceptual gap errors for a given topic for a user.
 * @param userId The user's ID
 * @param topicSlug The topic slug (e.g., "differentiation")
 */
export async function incrementConceptualGapError(
  userId: string,
  topicSlug: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get the current user data
  const { data: userRes } = await supabase
    .auth.admin.getUserById(userId);

  if (!userRes) {
    console.error("Failed to fetch user for metadata update");
    return;
  }

  const user = userRes.user;
  if (!user) return;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const misconceptionCounts = (metadata.misconception_counts ?? {}) as Record<string, number>;

  // Increment the count for the topic
  const currentCount = misconceptionCounts[topicSlug] || 0;
  const newCount = currentCount + 1;

  // Update the user's metadata
  await supabase
    .auth.admin.updateUserById(userId, {
      user_metadata: {
        misconception_counts: {
          ...misconceptionCounts,
          [topicSlug]: newCount,
        },
      },
    });
}

/**
 * Check if a misconception is detected for a given topic for a user.
 * A misconception is detected when the count of conceptual gap errors for the topic is >= 3.
 * @param userId The user's ID
 * @param topicSlug The topic slug
 * @returns True if a misconception is detected, false otherwise
 */
export async function isMisconceptionDetected(
  userId: string,
  topicSlug: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Get the current user data
  const { data: userRes } = await supabase
    .auth.admin.getUserById(userId);

  if (!userRes) {
    console.error("Failed to fetch user for misconception check");
    return false;
  }

  const user = userRes.user;
  if (!user) return false;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const misconceptionCounts = (metadata.misconception_counts ?? {}) as Record<string, number>;
  const count = misconceptionCounts[topicSlug] || 0;

  return count >= 3;
}

/**
 * Reset the misconception count for a given topic for a user.
 * @param userId The user's ID
 * @param topicSlug The topic slug
 */
export async function resetConceptualGapError(
  userId: string,
  topicSlug: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get the current user data
  const { data: userRes } = await supabase
    .auth.admin.getUserById(userId);

  if (!userRes) {
    console.error("Failed to fetch user for reset");
    return;
  }

  const user = userRes.user;
  if (!user) return;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const misconceptionCounts = (metadata.misconception_counts ?? {}) as Record<string, number>;

  // Set the count for this topic to 0
  await supabase
    .auth.admin.updateUserById(userId, {
      user_metadata: {
        misconception_counts: {
          ...misconceptionCounts,
          [topicSlug]: 0,
        },
      },
    });
}