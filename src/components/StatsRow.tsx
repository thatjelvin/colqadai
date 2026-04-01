"use client";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Brain, Target, Flame } from "lucide-react";

interface StatsRowProps {
  dueProblemsCount: number;
  totalMastered: number;
  streak: number;
  accuracy?: number; // Optional until backend supports it
}

export function StatsRow({ dueProblemsCount, totalMastered, streak, accuracy = 0 }: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>Due Today</CardDescription>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{dueProblemsCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Items ready for review</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>Mastered</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{totalMastered}</div>
          <p className="text-xs text-muted-foreground mt-1">Concepts mastered</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>Streak</CardDescription>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{streak}</div>
          <p className="text-xs text-muted-foreground mt-1">Days in a row</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>Accuracy</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{accuracy}%</div>
          <p className="text-xs text-muted-foreground mt-1">This week</p>
        </CardContent>
      </Card>
    </div>
  );
}
