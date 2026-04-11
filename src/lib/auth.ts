import { Plan, SubscriptionStatus, type User } from "@prisma/client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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

function pickDisplayName(user: { user_metadata?: Record<string, unknown> }) {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();

  const name = user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();

  return null;
}

function pickAvatar(user: { user_metadata?: Record<string, unknown> }) {
  const avatar = user.user_metadata?.avatar_url;
  if (typeof avatar === "string" && avatar.trim()) return avatar;

  const picture = user.user_metadata?.picture;
  if (typeof picture === "string" && picture.trim()) return picture;

  return null;
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
      nextEmailVerified?.getTime() !== existing.emailVerified?.getTime();

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
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !supabaseUser?.email) {
    return null;
  }

  const appUser = await ensureAppUserByEmail({
    email: supabaseUser.email,
    name: pickDisplayName(supabaseUser),
    image: pickAvatar(supabaseUser),
    emailVerified: supabaseUser.email_confirmed_at
      ? new Date(supabaseUser.email_confirmed_at)
      : null,
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
