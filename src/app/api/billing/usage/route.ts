import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getUsageSummary } from "@/lib/billing/usage";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
  if (!clerkUserId) { return new Response("Unauthorized", { status: 401 }); }
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) { return new Response("User not found in DB", { status: 404 }); }
  const session = { user: { id: dbUser.id, name: dbUser.name } };
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getUsageSummary(session.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
