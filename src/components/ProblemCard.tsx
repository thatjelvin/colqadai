"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Difficulty, ReviewStatus } from "@/lib/db-types";
import Link from "next/link";
import { CheckCircle2, Clock, Circle } from "lucide-react";

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

const difficultyVariants: Record<Difficulty, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

const getStatusColor = (status?: ReviewStatus) => {
  if (!status || status === "NEW") return "bg-muted text-muted-foreground";
  switch (status) {
    case "MASTERED": return "bg-success/20 text-success";
    case "REVIEW": return "bg-primary/20 text-primary";
    case "LEARNING": return "bg-secondary/20 text-secondary-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status?: ReviewStatus) => {
  if (!status || status === "NEW") return <Circle className="h-4 w-4" />;
  switch (status) {
    case "MASTERED": return <CheckCircle2 className="h-4 w-4" />;
    case "REVIEW": return <Clock className="h-4 w-4" />;
    case "LEARNING": return <Circle className="h-4 w-4" />;
    default: return <Circle className="h-4 w-4" />;
  }
};

export function ProblemCard({ problem, userProblem }: ProblemCardProps) {
  const status = userProblem?.status || "NEW";
  
  return (
    <Card className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-center space-x-4 flex-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{problem.title}</h4>
          </div>
          
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="truncate max-w-[120px] sm:max-w-none">{problem.topic.name}</span>
            <span>•</span>
            <Badge variant={difficultyVariants[problem.difficulty]} className="text-xs h-5">
              {problem.difficulty}
            </Badge>
            <span>•</span>
            <span className="capitalize">{status.toLowerCase()}</span>
            
            {userProblem?.nextReviewAt && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Review {new Date(userProblem.nextReviewAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="ml-4">
        <Link href={`/study/${problem.id}`}>
          <Button variant="ghost" size="sm">
            {userProblem ? "Practice" : "Start"}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
