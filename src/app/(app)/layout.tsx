import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let clerkUserId: string | null = null;
  try {
    const authResult = await auth();
    clerkUserId = authResult.userId;
  } catch (error) {
    console.error("SIGNUP ERROR: auth() failed in app layout", error);
    redirect("/sign-in");
  }

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const dbUser = await getOrCreateUserForClerkId(clerkUserId).catch((error) => {
    console.error("SIGNUP ERROR: failed to resolve app user", {
      clerkUserId,
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
