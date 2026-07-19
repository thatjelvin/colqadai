"use client";

import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  userVote: "UP" | "DOWN" | "NONE";
  onVote: (vote: "UP" | "DOWN") => void;
  disabled?: boolean;
}

export function VoteButtons({ upvotes, downvotes, userVote, onVote, disabled }: VoteButtonsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-1.5 text-xs gap-0.5",
          userVote === "UP" && "text-green-600 dark:text-green-400"
        )}
        onClick={() => onVote("UP")}
        disabled={disabled}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>{upvotes}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-1.5 text-xs gap-0.5",
          userVote === "DOWN" && "text-red-600 dark:text-red-400"
        )}
        onClick={() => onVote("DOWN")}
        disabled={disabled}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        <span>{downvotes}</span>
      </Button>
    </div>
  );
}
