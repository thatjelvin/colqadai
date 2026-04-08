import { LearningMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type JsonLike =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonLike }
  | JsonLike[];

function toPrismaJson(value: JsonLike): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

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
      aggregate: toPrismaJson(aggregate),
    },
    create: {
      userId,
      sessionKey,
      method,
      aggregate: toPrismaJson(aggregate),
    },
  });
}
