"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Target, Flame, TrendingUp, Calendar, AlertCircle, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

type DashboardStats = {
  masteryPercentage: number;
  totalSeen: number;
  streak: number;
  recallScore: number;
  topErrorType: string | null;
  topErrorCount: number;
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, usageRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/billing/usage"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (usageRes.ok) {
          const usage = await usageRes.json();
          setPlan(usage.plan ?? "free");
        }
      } catch (error) {
        console.error("Failed to load analytics:", error);
      }
    };

    load();
  }, []);

  const isPaid = plan === "pro" || plan === "max";

  if (!stats) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track your learning progress and identify areas for improvement
          {!isPaid && (
            <span className="ml-2 text-xs text-amber-600 font-medium">(7-day overview — upgrade for full access)</span>
          )}
        </p>
      </div>

      {/* Key Metrics — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardDescription className="font-medium text-foreground">Overall Accuracy</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.recallScore}%</div>
            <Progress value={stats.recallScore} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardDescription className="font-medium text-foreground">Mastered</CardDescription>
            <Brain className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-success">{stats.masteryPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">Mastery percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardDescription className="font-medium text-foreground">Current Streak</CardDescription>
            <Flame className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-semibold">{stats.streak}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Keep your daily review streak active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardDescription className="font-medium text-foreground">Time Studied</CardDescription>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.totalSeen}</div>
            <p className="text-xs text-muted-foreground mt-1">Total tracked problems</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail sections — blurred for free users */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${!isPaid ? "relative" : ""}`}>
        <Card className="border-error/20 bg-error/5">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-error" />
              <CardTitle className="text-lg">Focus Areas</CardTitle>
            </div>
            <CardDescription>Topics that need more attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              {stats.topErrorType
                ? `Most common error this week: ${stats.topErrorType.replaceAll("_", " ").toLowerCase()}`
                : "No dominant error pattern detected this week."}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.topErrorType ? `${stats.topErrorCount} attempts were tagged in this category.` : "Keep practicing mixed sessions for stable gains."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <CardTitle className="text-lg">Strong Areas</CardTitle>
            </div>
            <CardDescription>Topics you process very well</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Spaced-repetition mastery: {stats.masteryPercentage}%</p>
            <Progress value={stats.masteryPercentage} className="h-1.5 [&>div]:bg-success" />
            <p className="text-xs text-muted-foreground">Retrieval-first practice and interleaving are active for long-term retention.</p>
          </CardContent>
        </Card>

        {/* Blur overlay for free users */}
        {!isPaid && (
          <div className="absolute inset-0 rounded-lg backdrop-blur-sm bg-background/60 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-sm">Unlock full analytics with Pro</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              See your Focus Areas, Strong Areas, and week-over-week trends. Upgrade to Pro for the full picture.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}