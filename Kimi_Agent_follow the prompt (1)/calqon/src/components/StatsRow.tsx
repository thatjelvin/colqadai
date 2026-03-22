"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Flame, Target } from "lucide-react";

interface StatsRowProps {
  totalSeen: number;
  streak: number;
  masteryPercentage: number;
}

export function StatsRow({ totalSeen, streak, masteryPercentage }: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Problems Seen</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSeen}</div>
          <p className="text-xs text-muted-foreground">
            Total problems you&apos;ve studied
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Flame className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{streak} days</div>
          <p className="text-xs text-muted-foreground">
            Keep it up! Review daily to maintain.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mastery</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{masteryPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            Problems you&apos;ve mastered
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
