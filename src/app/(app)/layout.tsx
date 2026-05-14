import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

// Force fresh data on every request so the onboarding-completion flag is
// never served from the Next.js Data Cache after the user finishes onboarding.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (!user.email) {
    redirect("/login");
  }

  const appUser = await getOrCreateUserForSupabaseId(
    user.id,
    user.email,
    user.user_metadata?.full_name ?? null,
    user.user_metadata?.avatar_url ?? null
  );

  console.log("APP_LAYOUT PROFILE:", JSON.stringify({ id: appUser.id, onboardingCompleted: appUser.onboardingCompleted }));

  if (!appUser.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        user={{
          name: appUser.name,
          email: appUser.email,
          image: appUser.image,
        }}
        plan={appUser.plan}
      />
      <main className="lg:pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
      <FeedbackWidget />
    </div>
  );
}
