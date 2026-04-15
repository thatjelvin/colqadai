import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        user={{
          name: (user.user_metadata?.full_name as string | undefined) ?? null,
          email: user.email ?? null,
          image: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        }}
        plan="FREE"
      />
      <main className="lg:pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
