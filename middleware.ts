import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis/upstash";

function getChatMessageLimit(plan: string): number {
  if (plan === "MAX") return 600;
  if (plan === "PRO") return 120;
  return 10;
}

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/api/billing/webhook(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Rate limit chat API routes for authenticated users
  if (pathname.startsWith("/api/chat")) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (redis) {
      const today = new Date().toISOString().split("T")[0];
      const key = `ratelimit:${userId}:${today}`;

      try {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, 86400);
        }

        // Default to FREE limits in middleware; plan-based enforcement
        // happens at the API route level where DB access is available.
        const maxPerDay = getChatMessageLimit("FREE");
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
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

