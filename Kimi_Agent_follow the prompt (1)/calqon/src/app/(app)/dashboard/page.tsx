// @ts-nocheck
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsRow } from "@/components/StatsRow";
import { ProblemCard } from "@/components/ProblemCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {session.user.name || "Student"}!</h1>
        <p className="text-muted-foreground mt-1">
          Continue your math learning journey.
        </p>
      </div>

      <StatsRow
        totalSeen={totalSeen}
        streak={streak}
        masteryPercentage={masteryPercentage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Due for Review</h2>
            {dueProblems.length > 0 && (
              <Link href={`/app/study/${dueProblems[0].problem.id}`}>
                <Button variant="outline" size="sm">
                  Start Review Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          {dueProblems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No problems due for review! Great job keeping up.
                </p>
                <Link href="/app/topics" className="mt-4 inline-block">
                  <Button>Browse Topics</Button>
                </Link>
              </CardContent>
            </Card>
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
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Topics</h2>
          
          {recentTopics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Start studying to see your recent topics here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentTopics.map((topic) => (
                <Link key={topic.id} href={`/app/topics/${topic.slug}`}>
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{topic.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {topic.description || "No description available."}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
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
