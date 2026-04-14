import { currentUser } from "@clerk/nextjs/server";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the Prisma user for a Clerk user id, creating a row on first sign-in.
 */
export async function getOrCreateUserForClerkId(clerkUserId: string): Promise<User> {
  const existing = await prisma.user
    .findUnique({
      where: { clerkUserId: clerkUserId },
    })
    .catch((error) => {
      console.error("SIGNUP ERROR: failed to look up user by clerkUserId", {
        clerkUserId,
        error,
      });
      throw error;
    });

  if (existing) return existing;

  const clerk = await currentUser().catch((error) => {
    console.error("SIGNUP ERROR: failed to fetch Clerk currentUser", {
      clerkUserId,
      error,
    });
    throw error;
  });

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
  } catch (error) {
    const knownErrorCode =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;

    console.error("SIGNUP ERROR: failed creating user row", {
      clerkUserId,
      hasEmail: Boolean(email),
      knownErrorCode,
      error,
    });

    const raceWinner = await prisma.user
      .findUnique({
        where: { clerkUserId: clerkUserId },
      })
      .catch((raceError) => {
        console.error("SIGNUP ERROR: failed race recovery lookup", {
          clerkUserId,
          raceError,
        });
        throw raceError;
      });

    if (raceWinner) return raceWinner;

    const byEmail = await prisma.user.findUnique({ where: { email } }).catch((lookupError) => {
      console.error("SIGNUP ERROR: failed email recovery lookup", {
        clerkUserId,
        hasEmail: Boolean(email),
        lookupError,
      });
      throw lookupError;
    });

    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: {
          clerkUserId: clerkUserId,
          name: name ?? byEmail.name,
          image: image ?? byEmail.image,
        },
      }).catch((updateError) => {
        console.error("SIGNUP ERROR: failed linking existing user by email", {
          clerkUserId,
          userId: byEmail.id,
          updateError,
        });
        throw updateError;
      });
    }

    throw new Error(`Failed to create or link Prisma user for Clerk id ${clerkUserId}`);
  }
}
