export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";

export async function GET() {
  return NextResponse.json({
    free: {
      features: PLAN_DEFINITIONS.free.features,
      limits: PLAN_DEFINITIONS.free.limits,
    },
    pro: {
      features: PLAN_DEFINITIONS.pro.features,
      limits: PLAN_DEFINITIONS.pro.limits,
    },
    max: {
      features: PLAN_DEFINITIONS.max.features,
      limits: PLAN_DEFINITIONS.max.limits,
    },
  });
}
