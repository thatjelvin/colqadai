import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the Prisma user for a Clerk user id, creating a row on first sign-in.
 */
export async function getOrCreateUserForClerkId(clerkUserId: string): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { clerkUserId: clerkUserId },
  });
  if (existing) return existing;

  const clerk = await currentUser();
  const primaryEmailObj =
    (clerk &&
      clerk.emailAddresses.find((e) => e.id === clerk.primaryEmailAddressId)) ??
    clerk?.emailAddresses[0];
  const email = primaryEmailObj?.emailAddress ?? `${clerkUserId}@placeholder.com`;

  const name = clerk
    ? [clerk.firstName, clerk.lastName].filter(Boolean).join(" ").trim() || null
    : null;
  const image = clerk?.imageUrl ?? null;

  try {
    return await prisma.user.create({
      data: {
        clerkUserId: clerkUserId,
        email,
        name,
        image,
      },
    });
  } catch {
    const raceWinner = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
    });
    if (raceWinner) return raceWinner;

    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: {
          clerkUserId: clerkUserId,
          name: name ?? byEmail.name,
          image: image ?? byEmail.image,
        },
      });
    }

    throw new Error(`Failed to create or link Prisma user for Clerk id ${clerkUserId}`);
  }
}
