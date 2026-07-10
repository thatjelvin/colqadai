import { JsonValue, LearningMethod } from "@/lib/db-types";
import { db } from "@/lib/db";

/** Typed database client cast for the in-memory DB proxy. */
type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  upsert(args?: Record<string, unknown>): Promise<DbRecord>;
};
type PrismaLikeClient = {
  learningAnalytics: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

type JsonLike = JsonValue;

export async function upsertLearningAnalytics(
  userId: string,
  sessionKey: string,
  method: LearningMethod,
  aggregate: JsonLike
): Promise<void> {
  await dbClient.learningAnalytics.upsert({
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
