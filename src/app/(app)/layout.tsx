import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const dbUser = await getOrCreateUserForClerkId(clerkUserId);

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
