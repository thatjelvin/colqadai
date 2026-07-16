import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { computeStreak, uniqueDayKeys } from "@/lib/learning/streak";
import { DEFAULT_PREFERENCES, type NotificationPreferences, buildDailyReminder, buildStreakAtRiskMessage, buildWeeklySummary, MILESTONE_DAYS, getMilestoneInfo } from "@/lib/notifications";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = { findMany(args?: Record<string, unknown>): Promise<DbRecord[]>; count(args?: Record<string, unknown>): Promise<number> };
const dbClient = db as unknown as { userProblem: DbModelDelegate };

export async function GET(req: NextRequest) {
  // Security check - same as existing cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();
    const now = new Date();

    // Get all users with notification preferences
    const { data: users } = await adminSupabase
      .from("users")
      .select("id, email, name")
      .not("email", "is", null);

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    let sentCount = 0;

    for (const user of users) {
      try {
        // Get user preferences
        const { data: prefsData } = await adminSupabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        const prefs: NotificationPreferences = prefsData ? {
          dailyReminder: prefsData.daily_reminder ?? DEFAULT_PREFERENCES.dailyReminder,
          dailyReminderTime: prefsData.daily_reminder_time ?? DEFAULT_PREFERENCES.dailyReminderTime,
          streakAtRisk: prefsData.streak_at_risk ?? DEFAULT_PREFERENCES.streakAtRisk,
          milestoneCongrats: prefsData.milestone_congrats ?? DEFAULT_PREFERENCES.milestoneCongrats,
          weeklySummary: prefsData.weekly_summary ?? DEFAULT_PREFERENCES.weeklySummary,
        } : DEFAULT_PREFERENCES;

        // Get user problems for streak and due count
        const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
        const userProblems = await dbClient.userProblem.findMany({
          where: { userId: dbUser.id },
          select: { lastReviewedAt: true, nextReviewAt: true },
        }) as unknown as { lastReviewedAt: Date | string | null; nextReviewAt: Date | string }[];

        const streakInfo = computeStreak(
          userProblems.map((up) => (up.lastReviewedAt ? new Date(up.lastReviewedAt) : undefined))
        );

        const dueCount = await dbClient.userProblem.count({
          where: { userId: dbUser.id, nextReviewAt: { lte: now } },
        });

        // Check each notification type
        const notificationsToSend = [];

        // Daily reminder
        if (prefs.dailyReminder) {
          const [hourStr, minuteStr] = prefs.dailyReminderTime.split(":");
          const reminderTime = new Date(now);
          reminderTime.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);

          // Send if within 5-minute window of reminder time (to avoid missing executions)
          const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
          const isTimeWindow = timeDiff <= 5 * 60 * 1000; // 5 minutes

          if (isTimeWindow) {
            notificationsToSend.push({
              type: "daily_reminder",
              title: "Time to review",
              body: buildDailyReminder(dueCount),
              url: dueCount > 0 ? "/study" : "/topics",
            });
          }
        }

        // Streak at risk (check at 8pm local time)
        if (prefs.streakAtRisk && streakInfo.current > 0) {
          const eightPm = new Date(now);
          eightPm.setHours(20, 0, 0, 0); // 8:00 PM

          const timeDiff = Math.abs(now.getTime() - eightPm.getTime());
          const isTimeWindow = timeDiff <= 30 * 60 * 1000; // 30 minutes window

          const reviewedToday = streakInfo.reviewedToday;
          const shouldWarn = !reviewedToday && streakInfo.current >= 2; // Warn if streak >= 2 days and not reviewed today

          if (isTimeWindow && shouldWarn) {
            notificationsToSend.push({
              type: "streak_at_risk",
              title: "Don't lose your streak!",
              body: buildStreakAtRiskMessage(streakInfo.current),
              url: "/study",
            });
          }
        }

        // Milestone congratulations
        if (prefs.milestoneCongrats) {
          const milestoneInfo = getMilestoneInfo(streakInfo.current);
          if (milestoneInfo.atMilestone) {
            // Check if we haven't sent this milestone today (simple approach: send once per milestone)
            // In production, you'd track sent milestones in DB
            notificationsToSend.push({
              type: "milestone",
              title: "🎉 Streak Milestone!",
              body: milestoneInfo.message!,
              url: "/dashboard",
            });
          }
        }

        // Weekly summary (send on Mondays at 9am)
        if (prefs.weeklySummary) {
          const isMonday = now.getDay() === 1; // 0 = Sunday, 1 = Monday
          const nineAm = new Date(now);
          nineAm.setHours(9, 0, 0, 0);

          const timeDiff = Math.abs(now.getTime() - nineAm.getTime());
          const isTimeWindow = timeDiff <= 30 * 60 * 1000; // 30 minutes

          if (isMonday && isTimeWindow) {
            // In a real implementation, we'd fetch weekly stats from analytics
            // For now, use placeholder data
            notificationsToSend.push({
              type: "weekly_summary",
              title: "📊 Weekly Summary",
              body: buildWeeklySummary({
                problemsSolved: Math.floor(Math.random() * 20) + 5, // placeholder
                correctCount: Math.floor(Math.random() * 15) + 3,
                totalAttempts: Math.floor(Math.random() * 25) + 8,
                streak: streakInfo.current,
              }),
              url: "/analytics",
            });
          }
        }

        // Send notifications via push service (simplified - in production would use web-push library)
        for (const notif of notificationsToSend) {
          // In a real implementation, you would:
          // 1. Get user's push subscription from DB
          // 2. Use web-push library to send notification
          // 3. Log sent notifications
          // For demo, we'll just count them as sent

          console.log(`[NOTIFICATION] Sending ${notif.type} to ${user.email}:`, notif);
          sentCount++;
        }
      } catch (userError) {
        console.error(`Failed to process notifications for user ${user.id}:`, userError);
        // Continue with other users
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (error) {
    console.error("Cron notification error:", error);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}