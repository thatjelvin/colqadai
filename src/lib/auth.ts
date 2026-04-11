import { Plan, SubscriptionStatus, type User } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type AppSession = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    plan: Plan;
    subscriptionStatus: SubscriptionStatus;
  };
};

function toComparableTimestamp(value: Date | null | undefined) {
  return value ? value.getTime() : null;
}

async function ensureAppUserByEmail(params: {
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
}): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  });

  if (existing) {
    const nextName = params.name ?? existing.name;
    const nextImage = params.image ?? existing.image;
    const nextEmailVerified = params.emailVerified ?? existing.emailVerified;
    const needsUpdate =
      nextName !== existing.name ||
      nextImage !== existing.image ||
      toComparableTimestamp(nextEmailVerified) !== toComparableTimestamp(existing.emailVerified);

    if (!needsUpdate) {
      return existing;
    }

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: nextName,
        image: nextImage,
        emailVerified: nextEmailVerified,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: params.email,
      name: params.name,
      image: params.image,
      emailVerified: params.emailVerified,
    },
  });
}

export async function getServerSession(): Promise<AppSession | null> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const primaryEmailObj = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  ) ?? clerkUser.emailAddresses[0];

  const primaryEmail = primaryEmailObj?.emailAddress;

  if (!primaryEmail) {
    return null;
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null;
  const image = clerkUser.imageUrl || null;

  // Only treat the email as verified when Clerk has confirmed it.
  // Require email verification to be enabled in Clerk Dashboard settings.
  const emailVerified =
    primaryEmailObj?.verification?.status === "verified" ? new Date() : null;

  const appUser = await ensureAppUserByEmail({
    email: primaryEmail,
    name,
    image,
    emailVerified,
  });

  return {
    user: {
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      image: appUser.image,
      plan: appUser.plan,
      subscriptionStatus: appUser.subscriptionStatus,
    },
  };
}

