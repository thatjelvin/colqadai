"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { LeaderboardCard } from "@/components/challenge/LeaderboardCard";
import { StreakFreezeBadge } from "@/components/challenge/StreakFreezeBadge";
import { StreakChip } from "@/components/StreakChip";
import { Loader2 } from "lucide-react";

interface ChallengeData {
  problemId: string;
  problemBody: string;
  alreadyCompleted: boolean;
}

interface UserData {
  name: string | null;
  plan: "FREE" | "PRO" | "MAX";
  streak: number;
  longestStreak: number;
  reviewedToday: boolean;
  lastReviewDate: string | null;
}

export function ChallengePageClient() {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [streakBoosted, setStreakBoosted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch both challenge and user data in parallel
        const [challengeRes, overviewRes] = await Promise.all([
          fetch("/api/challenge/today"),
          fetch("/api/dashboard/overview"),
        ]);

        if (!challengeRes.ok) {
          setError("Failed to load today's challenge.");
          setLoading(false);
          return;
        }

        const challengeData = await challengeRes.json();
        setChallenge(challengeData);

        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          setUserData({
            name: null,
            plan: "FREE",
            streak: overviewData.streak ?? 0,
            longestStreak: overviewData.longestStreak ?? 0,
            reviewedToday: overviewData.reviewedToday ?? false,
            lastReviewDate: overviewData.lastReviewDate ?? null,
          });
        }

        // Get user data from auth
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null;
          // Determine plan by checking /api/challenge/freeze (PRO/MAX only)
          setUserData((prev) => ({
            ...(prev ?? { streak: 0, longestStreak: 0, reviewedToday: false, lastReviewDate: null, plan: "FREE" as const }),
            name: name as string | null,
          }));
        }

        setLoading(false);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleComplete = () => {
    setStreakBoosted(true);
    setChallenge((prev) => prev ? { ...prev, alreadyCompleted: true } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Challenge</h1>
          <p className="text-sm text-muted-foreground">
            Solve one problem per day to keep your streak going strong.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userData && (
            <StreakChip
              current={userData.streak}
              longest={userData.longestStreak}
              reviewedToday={userData.reviewedToday}
              size="md"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenge Card */}
        <div className="lg:col-span-2 space-y-4">
          {challenge ? (
            <ChallengeCard
              problemBody={challenge.problemBody}
              problemId={challenge.problemId}
              alreadyCompleted={challenge.alreadyCompleted}
              onComplete={handleComplete}
              streakBoosted={streakBoosted}
            />
          ) : (
            <div className="rounded-lg border p-8 text-center">
              <p className="text-sm text-muted-foreground">No challenge available today. Check back tomorrow!</p>
            </div>
          )}

          {/* Streak Info */}
          {userData && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-medium mb-2">Streak Protections</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <StreakFreezeBadge plan={userData.plan ?? "FREE"} />
                <span className="text-xs text-muted-foreground">
                  {userData.plan === "FREE"
                    ? "Upgrade to PRO to unlock streak freeze."
                    : "Use a freeze to protect your streak if you miss a day."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard Sidebar */}
        <div className="lg:col-span-1">
          <LeaderboardCard />
        </div>
      </div>
    </div>
  );
}
