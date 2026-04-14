import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { createServerClient } from "@/lib/supabase/server";

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

  const dbUser = await getOrCreateUserForSupabaseId(
    user.id,
    user.email!,
    // full_name is set by Supabase when the user signs up via OAuth or metadata update
    (user.user_metadata?.full_name as string | undefined) ?? null
  ).catch((error) => {
    console.error("AUTH ERROR: failed to resolve app user", {
      supabaseId: user.id,
      error,
    });
    throw error;
  });

  if (!dbUser.grade) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        user={{
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image,
        }}
        plan={dbUser.plan}
      />
      <main className="lg:pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
