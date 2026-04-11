import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis/upstash";
import { copyResponseCookies, updateSession } from "@/lib/supabase/middleware";

function getChatMessageLimit(plan: string): number {
  if (plan === "MAX") return 600;
  if (plan === "PRO") return 120;
  return 10;
}

const protectedPrefixes = [
  "/dashboard",
  "/topics",
  "/study",
  "/chat",
  "/reflections",
  "/error-log",
  "/notebooks",
  "/analytics",
];

function makeRedirectWithCookies(baseResponse: NextResponse, request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirectResponse = NextResponse.redirect(url);
  copyResponseCookies(baseResponse, redirectResponse);
  return redirectResponse;
}

function makeJsonWithCookies(baseResponse: NextResponse, body: unknown, status: number) {
  const jsonResponse = NextResponse.json(body, { status });
  copyResponseCookies(baseResponse, jsonResponse);
  return jsonResponse;
}

export default async function middleware(req: NextRequest) {
  const { response, user } = await updateSession(req);
  const isAuthenticated = Boolean(user);
  // plan is expected in app_metadata; user_metadata is fallback for legacy identities
  const userPlan = String(user?.app_metadata?.plan ?? user?.user_metadata?.plan ?? "FREE").toUpperCase();

  if (protectedPrefixes.some((prefix) => req.nextUrl.pathname.startsWith(prefix)) && !isAuthenticated) {
    return makeRedirectWithCookies(response, req, "/login");
  }

  if (req.nextUrl.pathname.startsWith("/api/chat") && !isAuthenticated) {
    return makeJsonWithCookies(response, { error: "Unauthorized" }, 401);
  }

  // Rate limit API routes for AI interactions
  if (req.nextUrl.pathname.startsWith("/api/chat") && isAuthenticated && redis) {
    const userId = user!.id;
    const today = new Date().toISOString().split("T")[0];
    const key = `ratelimit:${userId}:${today}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 86400);
      }

      const maxPerDay = getChatMessageLimit(userPlan);
      if (count > maxPerDay) {
        return makeJsonWithCookies(
          response,
          {
            error: "Daily chat limit reached.",
            upgradeUrl: "/pricing",
          },
          429
        );
      }
    } catch (e) {
      console.error("Rate limit error:", e);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/topics/:path*",
    "/study/:path*",
    "/chat/:path*",
    "/reflections/:path*",
    "/error-log/:path*",
    "/notebooks/:path*",
    "/analytics/:path*",
    "/api/chat/:path*",
  ],
};
