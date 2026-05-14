import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  userId: z.string().uuid(),
  page: z.string().min(1).max(512),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { message, rating, userId, page } = parsed.data;
    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      message,
      rating,
      page,
    });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Feedback table is missing. Run the required Supabase migrations first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to store feedback", error);
    return NextResponse.json({ error: "Failed to store feedback" }, { status: 500 });
  }
}
