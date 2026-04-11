import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      redirect("/sign-in");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!dbUser) {
      console.warn("[auth][layout] session user not found in database", {
        userId: session.user.id,
      });
      redirect("/sign-in");
    }

    if (!dbUser.grade) {
      redirect("/onboarding");
    }

    return (
      <div className="min-h-screen bg-background">
        <Sidebar user={session.user} plan={dbUser.plan} />
        <main className="lg:pl-64">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error("[auth][layout] failed to resolve authenticated layout", error);
    redirect("/sign-in");
  }
}
