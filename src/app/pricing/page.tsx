import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";
import { getUsageSummary } from "@/lib/billing/usage";
import { PricingCards } from "@/components/PricingCards";

export default async function PricingPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login"); }
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) { redirect("/login"); }
  const usage = await getUsageSummary(dbUser.id);

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
