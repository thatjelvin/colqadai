"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Difficulty, ReviewStatus } from "@prisma/client";
import Link from "next/link";

interface ProblemCardProps {
  problem: {
    id: string;
    title: string;
    difficulty: Difficulty;
    topic: {
      name: string;
      slug: string;
    };
  };
  userProblem?: {
    status: ReviewStatus;
    nextReviewAt: Date;
  } | null;
}

const difficultyColors: Record<Difficulty, "default" | "secondary" | "destructive"> = {
  EASY: "default",
  MEDIUM: "secondary",
  HARD: "destructive",
};

const statusColors: Record<ReviewStatus, "default" | "secondary" | "destructive" | "outline"> = {
  NEW: "outline",
  LEARNING: "secondary",
  REVIEW: "default",
  MASTERED: "default",
};

export function ProblemCard({ problem, userProblem }: ProblemCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {problem.topic.name}
            </p>
            <CardTitle className="text-lg">{problem.title}</CardTitle>
          </div>
          <Badge variant={difficultyColors[problem.difficulty]}>
            {problem.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {userProblem ? (
              <>
                <Badge variant={statusColors[userProblem.status]}>
                  {userProblem.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Next: {new Date(userProblem.nextReviewAt).toLocaleDateString()}
                </span>
              </>
            ) : (
              <Badge variant="outline">NEW</Badge>
            )}
          </div>
          <Link href={`/app/study/${problem.id}`}>
            <Button size="sm">
              {userProblem ? "Review now" : "Start learning"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
