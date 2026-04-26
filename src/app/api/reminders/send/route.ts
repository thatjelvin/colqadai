import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { findSubtopicBySlug } from "@/lib/topic-taxonomy";

const MAX_BATCH_SIZE = 100;

function resolveBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: reminders, error: remindersError } = await admin
      .from("review_reminders")
      .select("id, user_id, topic_slug, scheduled_for, sent")
      .eq("sent", false)
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(MAX_BATCH_SIZE);

    if (remindersError) {
      return NextResponse.json({ error: remindersError.message }, { status: 500 });
    }

    const baseUrl = resolveBaseUrl();
    let sentCount = 0;

    for (const reminder of reminders ?? []) {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(reminder.user_id);
      if (userError || !userData.user?.email) {
        console.warn("Skipping reminder due to missing user/email", reminder.id, userError?.message);
        continue;
      }

      const lookup = findSubtopicBySlug(reminder.topic_slug);
      const topicName = lookup?.subtopic.displayName ?? reminder.topic_slug;
      const reviewUrl = `${baseUrl}/review/${reminder.topic_slug}`;

      await sendEmail({
        to: userData.user.email,
        subject: `Time to review: ${topicName} on Colqad`,
        text: `It's time to review ${topicName}. Continue your session here: ${reviewUrl}`,
        html: `<p>It's time to review <strong>${topicName}</strong>.</p><p><a href="${reviewUrl}">Start your review session</a></p>`,
      });

      const { error: updateError } = await admin
        .from("review_reminders")
        .update({ sent: true })
        .eq("id", reminder.id);

      if (!updateError) {
        sentCount += 1;
      }
    }

    return NextResponse.json({ success: true, sent: sentCount, scanned: reminders?.length ?? 0 });
  } catch (error) {
    console.error("Reminder send cron failed", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
