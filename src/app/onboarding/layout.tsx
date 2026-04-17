import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

// Always read fresh profile data so an already-onboarded user is sent straight
// to /dashboard instead of being shown the onboarding form again.
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    // Not logged in — the middleware will handle redirecting to /login.
    return <>{children}</>;
  }

  const appUser = await getOrCreateUserForSupabaseId(
    user.id,
    user.email,
    user.user_metadata?.full_name ?? null,
    user.user_metadata?.avatar_url ?? null
  );

  console.log("ONBOARDING_LAYOUT PROFILE:", JSON.stringify({ id: appUser.id, onboardingCompleted: appUser.onboardingCompleted }));

  if (appUser.onboardingCompleted) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
