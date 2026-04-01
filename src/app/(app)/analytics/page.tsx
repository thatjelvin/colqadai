"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Target, Flame, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Mock data
const overallStats = {
  accuracy: 84,
  totalReviews: 1245,
  masteredConcepts: 23,
  learningConcepts: 45,
  currentStreak: 5,
  longestStreak: 12,
  timeSpent: "24h 15m",
};

const weakAreas = [
  { topic: "Integration Techniques", accuracy: 45, problems: 12 },
  { topic: "Series Convergence", accuracy: 52, problems: 8 },
  { topic: "Eigenvalues", accuracy: 58, problems: 15 },
];

const strongAreas = [
  { topic: "Derivatives", accuracy: 95, problems: 34 },
  { topic: "Matrix Operations", accuracy: 92, problems: 28 },
  { topic: "Basic Algebra", accuracy: 98, problems: 45 },
];

export default function AnalyticsPage() {
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
            <div className="text-3xl font-semibold">{overallStats.accuracy}%</div>
            <Progress value={overallStats.accuracy} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardDescription className="font-medium text-foreground">Mastered</CardDescription>
            <Brain className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-success">{overallStats.masteredConcepts}</div>
            <p className="text-xs text-muted-foreground mt-1">Concepts fully learned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardDescription className="font-medium text-foreground">Current Streak</CardDescription>
            <Flame className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-semibold">{overallStats.currentStreak}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Best: {overallStats.longestStreak} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardDescription className="font-medium text-foreground">Time Studied</CardDescription>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{overallStats.timeSpent}</div>
            <p className="text-xs text-muted-foreground mt-1">Over {overallStats.totalReviews} reviews</p>
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
          <CardContent className="space-y-4">
            {weakAreas.map((area, i) => (
              <div key={i} className="flex flex-col space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{area.topic}</span>
                  <span className="text-error font-medium">{area.accuracy}%</span>
                </div>
                <Progress value={area.accuracy} className="h-1.5 [&>div]:bg-error" />
                <span className="text-xs text-muted-foreground">
                  Based on {area.problems} recent problems
                </span>
              </div>
            ))}
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
          <CardContent className="space-y-4">
            {strongAreas.map((area, i) => (
              <div key={i} className="flex flex-col space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{area.topic}</span>
                  <span className="text-success font-medium">{area.accuracy}%</span>
                </div>
                <Progress value={area.accuracy} className="h-1.5 [&>div]:bg-success" />
                <span className="text-xs text-muted-foreground">
                  Based on {area.problems} established answers
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}