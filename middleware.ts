// @ts-nocheck
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis/upstash";

export default withAuth(
  async function middleware(req) {
    const userId = req.nextauth.token?.id;
    
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
        
        // Free tier maximum 3 interactions per day
        if (count > 3) {
          return NextResponse.json(
            { error: "Daily limit reached. Upgrade to Pro for unlimited access." },
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
  matcher: ["/app/:path*", "/api/chat/:path*"],
};
