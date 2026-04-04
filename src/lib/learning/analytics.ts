import { LearningMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type JsonLike =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonLike }
  | JsonLike[];

export async function upsertLearningAnalytics(
  userId: string,
  sessionKey: string,
  method: LearningMethod,
  aggregate: JsonLike
): Promise<void> {
  await prisma.learningAnalytics.upsert({
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
