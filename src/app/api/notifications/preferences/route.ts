export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PREFERENCES, type NotificationPreferences } from "@/lib/notifications";

const prefsSchema = z.object({
  dailyReminder: z.boolean(),
  dailyReminderTime: z.string().regex(/^\d{2}:\d{2}$/),
  streakAtRisk: z.boolean(),
  milestoneCongrats: z.boolean(),
  weeklySummary: z.boolean(),
});

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
  }

  return NextResponse.json({
    preferences: {
      dailyReminder: data.daily_reminder ?? DEFAULT_PREFERENCES.dailyReminder,
      dailyReminderTime: data.daily_reminder_time ?? DEFAULT_PREFERENCES.dailyReminderTime,
      streakAtRisk: data.streak_at_risk ?? DEFAULT_PREFERENCES.streakAtRisk,
      milestoneCongrats: data.milestone_congrats ?? DEFAULT_PREFERENCES.milestoneCongrats,
      weeklySummary: data.weekly_summary ?? DEFAULT_PREFERENCES.weeklySummary,
    } satisfies NotificationPreferences,
  });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { getOrCreateUserForSupabaseId } = await import("@/lib/supabase-db-user");
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email ?? "");

  const body = await req.json();
  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  const { dailyReminder, dailyReminderTime, streakAtRisk, milestoneCongrats, weeklySummary } =
    parsed.data;

  const { error } = await adminSupabase.from("notification_preferences").upsert(
    {
      user_id: dbUser.id,
      daily_reminder: dailyReminder,
      daily_reminder_time: dailyReminderTime,
      streak_at_risk: streakAtRisk,
      milestone_congrats: milestoneCongrats,
      weekly_summary: weeklySummary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Failed to save notification preferences:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
