"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoteButtons } from "./VoteButtons";
import { Sparkles, Flag, Trash2 } from "lucide-react";

interface SolutionCardProps {
  solution: {
    id: string;
    solution: string;
    isAlternativeMethod: boolean;
    upvotes: number;
    downvotes: number;
    userVote: "UP" | "DOWN" | "NONE";
    isOwn: boolean;
    createdAt: string;
  };
  onVote: (vote: "UP" | "DOWN") => void;
  onReport: () => void;
  onDelete: () => void;
}

const anonymousNames = [
  "MathNinja", "CalcWizard", "DerivMaster", "IntegralPro",
  "TheoremHunter", "ProofBuilder", "SigmaSolver", "VectorVoyager",
  "LimitBreaker", "FunctionFury",
];

function getAnonymousName(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return anonymousNames[Math.abs(hash) % anonymousNames.length] + id.slice(-3);
}

export function SolutionCard({ solution, onVote, onReport, onDelete }: SolutionCardProps) {
  return (
    <Card className="border-muted">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{getAnonymousName(solution.id)}</span>
            {solution.isAlternativeMethod && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                Alternative Method
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(solution.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {solution.solution}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between py-2 px-4 border-t bg-muted/20">
        <VoteButtons
          upvotes={solution.upvotes}
          downvotes={solution.downvotes}
          userVote={solution.userVote}
          onVote={onVote}
        />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={onReport}>
            <Flag className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          {solution.isOwn && (
            <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
