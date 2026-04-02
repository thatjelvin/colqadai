// @ts-nocheck
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis/upstash";
type PlanValue = "FREE" | "PRO" | "MAX";
type SubscriptionStatusValue = "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

function resolveEffectivePlan(plan?: PlanValue, subscriptionStatus?: SubscriptionStatusValue): PlanValue {
  if (!plan || plan === "FREE") {
    return "FREE";
  }

  const isActive =
    subscriptionStatus === "ACTIVE" ||
    subscriptionStatus === "TRIALING";

  return isActive ? plan : "FREE";
}

function getChatMessageLimit(plan: PlanValue): number {
  if (plan === "MAX") return 600;
  if (plan === "PRO") return 120;
  return 10;
}

export default withAuth(
  async function middleware(req) {
    const userId = req.nextauth.token?.id;
    const effectivePlan = resolveEffectivePlan(
      req.nextauth.token?.plan as PlanValue | undefined,
      req.nextauth.token?.subscriptionStatus as SubscriptionStatusValue | undefined
    );

    if (req.nextUrl.pathname.startsWith("/analytics") && effectivePlan === "FREE") {
      const url = req.nextUrl.clone();
      url.pathname = "/pricing";
      url.searchParams.set("feature", "analytics");
      return NextResponse.redirect(url);
    }

    if (req.nextUrl.pathname.startsWith("/notebooks") && effectivePlan === "FREE") {
      const url = req.nextUrl.clone();
      url.pathname = "/pricing";
      url.searchParams.set("feature", "notebooks");
      return NextResponse.redirect(url);
    }
    
    // Rate limit API routes for AI interactions
    if (req.nextUrl.pathname.startsWith("/api/chat") && userId && redis) {
      const today = new Date().toISOString().split("T")[0];
      const key = `ratelimit:${userId}:${today}`;
      
      try {
        const count = await redis.incr(key);
        if (count === 1) {
          // Set expiry to 24 hours
          await redis.expire(key, 86400);
        }
        
        const maxPerDay = getChatMessageLimit(effectivePlan);
        if (count > maxPerDay) {
          return NextResponse.json(
            {
              error: "Daily chat limit reached.",
              upgradeUrl: "/pricing",
            },
            { status: 429 }
          );
        }
      } catch (e) {
        console.error("Rate limit error:", e);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        if (req.nextUrl.pathname.startsWith("/app")) {
          return token !== null;
        }
        if (req.nextUrl.pathname.startsWith("/api/chat")) {
          return token !== null;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/app/:path*", "/api/chat/:path*", "/analytics", "/notebooks"],
};
