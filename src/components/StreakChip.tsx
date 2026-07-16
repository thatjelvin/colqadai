"use client";

import { cn } from "@/lib/utils";
import { Flame, Trophy } from "lucide-react";
import { getStreakMilestoneInfo } from "@/lib/learning/growthMindset";

interface StreakChipProps {
  current: number;
  longest?: number;
  reviewedToday?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLongest?: boolean;
  showMilestone?: boolean;
  showIdentity?: boolean;
}

const sizeClasses: Record<NonNullable<StreakChipProps["size"]>, string> = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1.5",
  lg: "text-base px-3 py-1.5 gap-2",
};

const iconSizes: Record<NonNullable<StreakChipProps["size"]>, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function StreakChip({
  current,
  longest,
  reviewedToday = false,
  className,
  size = "md",
  showLongest = false,
  showMilestone = false,
  showIdentity = false,
}: StreakChipProps) {
  const active = current > 0;
  const milestone = showMilestone ? getStreakMilestoneInfo(current) : null;

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <div
        role="status"
        aria-label={
          active
            ? `${current}-day streak${reviewedToday ? ", reviewed today" : ""}`
            : "No active streak"
        }
        className={cn(
          "inline-flex items-center rounded-full border",
          active
            ? "border-secondary/40 bg-secondary/10 text-secondary-foreground"
            : "border-border bg-muted text-muted-foreground",
          sizeClasses[size]
        )}
      >
        <Flame
          className={cn(
            iconSizes[size],
            active ? "text-secondary" : "text-muted-foreground"
          )}
        />
        <span className="font-semibold tabular-nums">
          {active ? `${current}-day streak` : "No streak yet"}
        </span>
        {showLongest && longest !== undefined && longest > 0 && (
          <span className="text-muted-foreground">· best {longest}</span>
        )}
        {milestone?.current && (
          <span className="inline-flex items-center gap-1 ml-1">
            <Trophy className={cn(iconSizes[size], "text-amber-500")} />
            <span className="text-amber-600 dark:text-amber-400 font-medium">{milestone.current.badge}</span>
          </span>
        )}
      </div>
      {showIdentity && milestone?.identityMessage && (
        <p className="text-xs text-muted-foreground italic">{milestone.identityMessage}</p>
      )}
      {showMilestone && active && milestone?.next && (
        <p className="text-xs text-muted-foreground">
          {milestone.daysUntilNext} day{milestone.daysUntilNext !== 1 ? "s" : ""} until {milestone.next.badge} badge
        </p>
      )}
    </div>
  );
}
