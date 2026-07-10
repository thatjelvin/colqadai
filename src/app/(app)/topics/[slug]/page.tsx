import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { computeTopicMasteryForUser } from "@/lib/learning/mastery";
import { db } from "@/lib/db";
import { ProblemCard } from "@/components/ProblemCard";

/** Generic record type for in-memory DB results — replaces bare `any`. */
type DbRecord = Record<string, unknown>;

/** Typed model delegate for the in-memory DB proxy. */
type DbModelDelegate = {
  findUnique(args?: Record<string, unknown>): Promise<DbRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
};

type PrismaLikeClient = {
  topic: DbModelDelegate;
  userProblem: DbModelDelegate;
};

const dbClient = db as unknown as PrismaLikeClient;

type TopicRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  problems: Array<{ id: string; title: string; difficulty: string }>;
  children: Array<{
    id: string;
    slug: string;
    name: string;
    problems: Array<{ id: string }>;
  }>;
};

type UserProblemRecord = {
  problemId: string;
  status: string;
  nextReviewAt: Date | string | null;
  [key: string]: unknown;
};

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Shuffle, BookOpen, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Difficulty, ReviewStatus } from "@/lib/db-types";

interface TopicPageProps {
  params: {
    slug: string;
  };
}

const bandColors: Record<string, string> = {
  none: "text-muted-foreground",
  novice: "text-secondary",
  developing: "text-secondary",
  proficient: "text-primary",
  mastered: "text-success",
};

const bandLabels: Record<string, string> = {
  none: "Not started",
  novice: "Novice",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};

export default async function TopicPage({ params }: TopicPageProps) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;

  const topic = await dbClient.topic.findUnique({
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
  }) as TopicRecord | null;

  if (!topic) {
    notFound();
  }

  const mastery = await computeTopicMasteryForUser(userId, params.slug);

  const problemIds = topic.problems.map((p) => p.id);
  const childProblemIds = topic.children.flatMap((c) =>
    c.problems.map((p) => p.id)
  );
  const allProblemIds = [...problemIds, ...childProblemIds];

  const userProblems = await dbClient.userProblem.findMany({
    where: {
      userId,
      problemId: {
        in: allProblemIds,
      },
    },
  }) as UserProblemRecord[];

  const userProblemMap = new Map(userProblems.map((up) => [up.problemId, up]));

  const trendIcon = mastery.recentRatingTrend === "improving"
    ? <TrendingUp className="h-4 w-4" />
    : mastery.recentRatingTrend === "declining"
      ? <TrendingDown className="h-4 w-4" />
      : <Minus className="h-4 w-4" />;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Your Mastery
                </CardTitle>
                <CardDescription>Honest measure of how well you know this topic.</CardDescription>
              </div>
              <Badge variant="outline" className={bandColors[mastery.band]}>
                {bandLabels[mastery.band]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-bold tracking-tight">{mastery.masteryPercentage}%</span>
              <span className="text-sm text-muted-foreground">
                {mastery.attemptedProblems} of {mastery.totalProblems || topic.problems.length} problems attempted
              </span>
            </div>
            <Progress value={mastery.masteryPercentage} className="h-2" />
            {mastery.averageRating !== null && (
              <p className="text-xs text-muted-foreground">
                Average recent rating: {mastery.averageRating.toFixed(1)} / 5
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-semibold">
              {trendIcon}
              <span className="capitalize">{mastery.recentRatingTrend}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on your last few reviews of this topic.
            </p>
            {mastery.averageFirstTryRate > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                First-try success: {Math.round(mastery.averageFirstTryRate * 100)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Problems</h2>
          {topic.problems.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              No problems available in this topic yet.
            </div>
          ) : (
            <div className="space-y-4">
              {topic.problems.map((problem) => {
                const up = userProblemMap.get(problem.id);
                return (
                  <ProblemCard
                    key={problem.id}
                    problem={{
                      ...problem,
                      difficulty: problem.difficulty as Difficulty,
                      topic: { name: topic.name, slug: topic.slug },
                    }}
                    userProblem={up ? {
                      status: up.status as ReviewStatus,
                      nextReviewAt: up.nextReviewAt ? new Date(up.nextReviewAt) : new Date(),
                    } : null}
                  />
                );
              })}
            </div>
          )}
        </div>

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