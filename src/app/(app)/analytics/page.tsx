"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Target, Flame, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) throw new Error("Failed to load stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      }
    };

    load();
  }, []);

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
        </p>
      </div>

      {/* Key Metrics */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
}