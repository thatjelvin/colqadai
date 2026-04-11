import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatsRow } from "@/components/StatsRow";
import { ProblemCard } from "@/components/ProblemCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, BookOpen, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  // Get due problems
  const now = new Date();
  const dueProblems = await prisma.userProblem.findMany({
    where: {
      userId,
      nextReviewAt: {
        lte: now,
      },
    },
    include: {
      problem: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: {
      nextReviewAt: "asc",
    },
    take: 10,
  });

  // Get recent topics
  const recentUserProblems = await prisma.userProblem.findMany({
    where: { userId },
    orderBy: { lastReviewedAt: "desc" },
    take: 10,
    include: {
      problem: {
        include: {
          topic: true,
        },
      },
    },
  });

  const recentTopicIds = new Set();
  const recentTopics = [];

  for (const up of recentUserProblems) {
    const topicId = up.problem.topic.id;
    if (!recentTopicIds.has(topicId) && recentTopics.length < 3) {
      recentTopicIds.add(topicId);
      recentTopics.push(up.problem.topic);
    }
  }

  // Get stats
  const userProblems = await prisma.userProblem.findMany({
    where: { userId },
  });

  const totalSeen = userProblems.length;
  const masteredCount = userProblems.filter(
    (up) => up.status === "MASTERED"
  ).length;
  const masteryPercentage =
    totalSeen > 0 ? Math.round((masteredCount / totalSeen) * 100) : 0;

  // Calculate streak
  const streak = calculateStreak(userProblems);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [attemptsThisWeek, firstAttemptCorrectCount, weeklyErrorGroups] = await Promise.all([
    prisma.problemAttempt.count({
      where: {
        userId,
        createdAt: {
          gte: weekAgo,
        },
      },
    }),
    prisma.problemAttempt.count({
      where: {
        userId,
        createdAt: {
          gte: weekAgo,
        },
        isCorrect: true,
        attemptNumber: 1,
      },
    }),
    prisma.problemAttempt.groupBy({
      by: ["errorType"],
      where: {
        userId,
        isCorrect: false,
        createdAt: {
          gte: weekAgo,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          errorType: "desc",
        },
      },
    }),
  ]);

  const recallScore = attemptsThisWeek > 0 ? Math.round((firstAttemptCorrectCount / attemptsThisWeek) * 100) : 0;
  const topError = weeklyErrorGroups.find((group) => group.errorType);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Welcome back{session.user.name ? `, ${session.user.name}` : ""}</h1>
        <p className="text-muted-foreground">
          {dueProblems.length > 0
            ? `You have ${dueProblems.length} items due for review`
            : "All caught up! Great work."}
        </p>
      </div>

      <StatsRow
        dueProblemsCount={dueProblems.length}
        streak={streak}
        totalMastered={masteredCount}
        accuracy={masteryPercentage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Due for Review</CardTitle>
                  <CardDescription>Items scheduled for today</CardDescription>
                </div>
                {dueProblems.length > 0 && (
                  <Link href="/study">
                    <Button>Start Review</Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {dueProblems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items due. You&apos;re all caught up!</p>
                  <Link href="/topics" className="mt-4 inline-block">
                    <Button variant="outline">Browse Topics</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dueProblems.map((up) => (
                    <ProblemCard
                      key={up.id}
                      problem={up.problem}
                      userProblem={up}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recall Score</CardTitle>
              <CardDescription>First-attempt correctness this week</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{recallScore}%</p>
              <p className="text-xs text-muted-foreground mt-1">{firstAttemptCorrectCount} first-attempt solves out of {attemptsThisWeek} attempts</p>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Weekly Error Trend</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>
                {topError
                  ? `Most common error: ${topError.errorType?.replaceAll("_", " ").toLowerCase()}`
                  : "No recurring errors detected this week"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/error-log">
                <Button variant="outline" className="w-full">Open Error Log</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Topics</CardTitle>
              <CardDescription>Continue where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTopics.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Start studying to see your recent topics here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTopics.map((topic) => (
                    <Link key={topic.id} href={`/topics/${topic.slug}`}>
                      <div className="space-y-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{topic.name}</h4>
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="line-clamp-1">{topic.description || "No description available."}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  <Link href="/topics">
                    <Button variant="outline" className="w-full mt-4">
                      View All Topics
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function calculateStreak(
  userProblems: { lastReviewedAt: Date | null }[]
): number {
  if (userProblems.length === 0) return 0;

  const reviewDates = new Set<string>();

  for (const up of userProblems) {
    if (up.lastReviewedAt) {
      const date = new Date(up.lastReviewedAt);
      const dateStr = date.toISOString().split("T")[0];
      reviewDates.add(dateStr);
    }
  }

  if (reviewDates.size === 0) return 0;

  const sortedDates = Array.from(reviewDates).sort().reverse();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const mostRecentDate = sortedDates[0];
  if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
    return 0;
  }

  let streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i - 1]);
    const prevDate = new Date(sortedDates[i]);

    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
