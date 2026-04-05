import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProblemCard } from "@/components/ProblemCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ArrowLeft, Shuffle, BookOpen } from "lucide-react";

interface TopicPageProps {
  params: {
    slug: string;
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Get topic with problems
  const topic = await prisma.topic.findUnique({
    where: { slug: params.slug },
    include: {
      problems: {
        orderBy: {
          difficulty: "asc",
        },
      },
      children: {
        include: {
          problems: true,
        },
      },
    },
  });

  if (!topic) {
    notFound();
  }

  // Get user's progress for problems in this topic
  const problemIds = topic.problems.map((p) => p.id);
  const childProblemIds = topic.children.flatMap((c) =>
    c.problems.map((p) => p.id)
  );
  const allProblemIds = [...problemIds, ...childProblemIds];

  const userProblems = await prisma.userProblem.findMany({
    where: {
      userId,
      problemId: {
        in: allProblemIds,
      },
    },
  });

  const userProblemMap = new Map(userProblems.map((up) => [up.problemId, up]));

  // Calculate progress
  const masteredCount = topic.problems.filter((p) => {
    const up = userProblemMap.get(p.id);
    return up?.status === "MASTERED";
  }).length;

  const progressPercentage =
    topic.problems.length > 0
      ? Math.round((masteredCount / topic.problems.length) * 100)
      : 0;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/topics">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BookOpen className="h-4 w-4" />
              <span>Topics</span>
              <span>/</span>
              <span className="text-foreground">{topic.name}</span>
            </div>
            <h1 className="text-3xl font-bold">{topic.name}</h1>
            {topic.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">{topic.description}</p>
            )}
          </div>
        </div>
        <Link href="/study">
          <Button className="w-full md:w-auto">
            <Shuffle className="mr-2 h-4 w-4" />
            Start Interleaved Session
          </Button>
        </Link>
      </div>

      {/* Progress */}
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Your Progress</h3>
            <p className="text-sm text-muted-foreground">Keep studying to master this topic</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{progressPercentage}%</span>
            <p className="text-sm text-muted-foreground">{masteredCount} of {topic.problems.length} mastered</p>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Problems Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Problems</h2>
          {topic.problems.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              No problems available in this topic yet.
            </div>
          ) : (
            <div className="space-y-4">
              {topic.problems.map((problem) => (
                <ProblemCard
                  key={problem.id}
                  problem={{
                    ...problem,
                    topic: { name: topic.name, slug: topic.slug },
                  }}
                  userProblem={userProblemMap.get(problem.id) || null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Subtopics Sidebar */}
        <div className="space-y-4">
          {topic.children.length > 0 && (
            <>
              <h2 className="text-xl font-semibold">Subtopics</h2>
              <div className="space-y-3">
                {topic.children.map((child) => (
                  <Link key={child.id} href={`/topics/${child.slug}`}>
                    <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors cursor-pointer shadow-sm">
                      <h3 className="font-medium text-sm">{child.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {child.problems.length} problems
                        </span>
                        <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
