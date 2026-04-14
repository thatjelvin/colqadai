import { type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the Prisma user for a Supabase user id, creating a row on first sign-in.
 */
export async function getOrCreateUserForSupabaseId(
  supabaseId: string,
  email: string,
  name?: string | null,
  image?: string | null
): Promise<User> {
  const existing = await prisma.user
    .findUnique({ where: { supabaseId } })
    .catch((error) => {
      console.error("AUTH ERROR: failed to look up user by supabaseId", {
        supabaseId,
        error,
      });
      throw error;
    });

  if (existing) return existing;

  try {
    return await prisma.user.create({
      data: {
        supabaseId,
        email,
        name: name ?? null,
        image: image ?? null,
      },
    });
  } catch (error) {
    // Handle race condition: another request may have just created the row
    const raceWinner = await prisma.user
      .findUnique({ where: { supabaseId } })
      .catch(() => null);

    if (raceWinner) return raceWinner;

    const byEmail = await prisma.user
      .findUnique({ where: { email } })
      .catch(() => null);

    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: {
          supabaseId,
          name: name ?? byEmail.name,
          image: image ?? byEmail.image,
        },
      });
    }

    console.error("AUTH ERROR: failed to create or link user", {
      supabaseId,
      email,
      error,
    });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create or link user for Supabase id ${supabaseId}: ${message}`);
  }
}
