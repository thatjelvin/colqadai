import { JsonValue, LearningMethod } from "@/lib/db-types";
import { db } from "@/lib/db";

type JsonLike = JsonValue;

export async function upsertLearningAnalytics(
  userId: string,
  sessionKey: string,
  method: LearningMethod,
  aggregate: JsonLike
): Promise<void> {
  await db.learningAnalytics.upsert({
    where: {
      userId_sessionKey_method: {
        userId,
        sessionKey,
        method,
      },
    },
    update: {
      aggregate,
    },
    create: {
      userId,
      sessionKey,
      method,
      aggregate,
    },
  });
}
