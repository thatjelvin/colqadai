import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProblemCard } from "@/components/ProblemCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";

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

  // Find next problem to study (first due, or first new)
  const now = new Date();
  const dueProblem = topic.problems.find((p) => {
    const up = userProblemMap.get(p.id);
    return up && up.nextReviewAt <= now;
  });

  const newProblem = topic.problems.find((p) => !userProblemMap.has(p.id));

  const nextProblemId = dueProblem?.id || newProblem?.id;

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/topics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{topic.name}</h1>
          {topic.description && (
            <p className="text-muted-foreground mt-1">{topic.description}</p>
          )}
        </div>
        {nextProblemId && (
          <Link href={`/app/study/${nextProblemId}`}>
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Start Studying
            </Button>
          </Link>
        )}
      </div>

      {/* Progress */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Your Progress</span>
          <span className="text-muted-foreground">
            {masteredCount} / {topic.problems.length} mastered
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Problems */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Problems</h2>
        {topic.problems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No problems available in this topic yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
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

      {/* Subtopics */}
      {topic.children.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Subtopics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topic.children.map((child) => (
              <Link key={child.id} href={`/app/topics/${child.slug}`}>
                <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                  <h3 className="font-medium">{child.name}</h3>
                  {child.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {child.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {child.problems.length} problems
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
