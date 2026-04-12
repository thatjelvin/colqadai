import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getUsageSummary } from "@/lib/billing/usage";
import { PricingCards } from "@/components/PricingCards";

export default async function PricingPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) { redirect("/sign-in"); }
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) { redirect("/sign-in"); }
  const session = { user: { id: dbUser.id, name: dbUser.name } };
  const usage = session?.user?.id ? await getUsageSummary(session.user.id) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Choose Your Learning Velocity</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Free gets you real progress, Pro unlocks the best value for daily serious practice,
            and Max is built for heavy AI usage and power learners.
          </p>
        </div>

        <PricingCards usage={usage} />
      </div>
    </div>
  );
}
