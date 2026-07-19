export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { getOrCreateUserForSupabaseId } = await import("@/lib/supabase-db-user");
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

  const body = await req.json();
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("push_subscriptions").upsert(
    {
      user_id: dbUser.id,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = body.endpoint;

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { getOrCreateUserForSupabaseId } = await import("@/lib/supabase-db-user");
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

  const adminSupabase = createAdminClient();
  await adminSupabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", dbUser.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
