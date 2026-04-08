import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInterleavedQueue } from "@/lib/learning/interleaving";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Target, Play } from "lucide-react";

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const now = new Date();

  // Get due problems
  const dueProblems = await prisma.userProblem.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
    },
    include: {
      problem: {
        include: { topic: true },
      },
    },
    orderBy: { nextReviewAt: "asc" },
  });

  const interleavedQueue = buildInterleavedQueue(
    dueProblems.map((up) => ({
      id: up.id,
      nextReviewAt: up.nextReviewAt,
      topicTag: up.problem.topicTag,
      topicSlug: up.problem.topic.slug,
      problem: up.problem,
    }))
  );

  const topicsPracticed = new Set(interleavedQueue.map((item) => item.topicTag || item.topicSlug));

  // Calculate stats
  const todayCount = dueProblems.filter(up => {
    // If it was due very recently vs days ago
    const dueTime = new Date(up.nextReviewAt).getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    return (now.getTime() - dueTime) < msPerDay; // within a day
  }).length;

  const overdueCount = dueProblems.length - todayCount;

  // Assuming average of 1.5 mins per review
  const estimatedMins = Math.ceil(dueProblems.length * 1.5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Spaced Repetition Review</h1>
        <p className="text-muted-foreground">
          Review items scheduled for today to maintain long-term retention
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Due Today</CardDescription>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{todayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Items to review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Overdue</CardDescription>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-semibold ${overdueCount > 0 ? 'text-destructive' : ''}`}>
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Estimated Time</CardDescription>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{estimatedMins}m</div>
            <p className="text-xs text-muted-foreground mt-1">To complete all</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Due Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Review Queue</CardTitle>
                    <CardDescription>{interleavedQueue.length} items ready for review</CardDescription>
                </div>
                  {interleavedQueue.length > 0 && (
                    <Link href={`/study/${interleavedQueue[0].problem.id}`}>
                    <Button>
                      <Play className="h-4 w-4 mr-2" />
                      Start Review
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
                {interleavedQueue.length > 0 ? (
                <div className="space-y-3">
                    {interleavedQueue.map((up) => {
                    const isOverdue = (now.getTime() - new Date(up.nextReviewAt).getTime()) >= 24 * 60 * 60 * 1000;
                    const daysOverdue = Math.floor((now.getTime() - new Date(up.nextReviewAt).getTime()) / (24 * 60 * 60 * 1000));
                    return (
                      <div
                        key={up.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{up.problem.title}</h4>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                                {daysOverdue}d overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <span>Problem</span>
                            <span>•</span>
                            <span className="truncate">{up.problem.topic.name}</span>
                          </div>
                        </div>
                        <Link href={`/study/${up.problem.id}`}>
                          <Button variant="ghost" size="sm" className="shrink-0">
                            Review
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium mb-1">All caught up!</p>
                  <p className="text-sm">No items due for review right now</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Static info */}
        <div>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Interleaved Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {topicsPracticed.size > 1
                    ? `You practiced ${topicsPracticed.size} different topics - great for long-term retention.`
                    : "Mixing topics improves long-term retention. Keep building variety."}
                </p>
              </CardContent>
            </Card>

          <Card className="mb-4 bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Review Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <p>• Try to work out the full solution before checking.</p>
              <p>• Be honest with your self-ratings to optimize the algorithm.</p>
              <p>• Doing targeted daily reviews builds strong long-term memory.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
