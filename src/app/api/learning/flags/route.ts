import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getLearningFeatureFlags } from "@/lib/learning/featureFlags";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flags = await getLearningFeatureFlags();
  return NextResponse.json(flags);
}
