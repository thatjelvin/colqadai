"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ListOrdered, Zap, Brain } from "lucide-react";

interface QueueItem {
  id: string;
  title: string;
  topicName: string;
  topicSlug: string | null;
  kind: "due" | "new";
  priorityScore: number;
  overdueDays: number;
  easeFactor: number;
  difficulty: string;
  urgencyLabel: { label: string; color: string };
  forecastLabel: string;
}

interface ReviewQueueProps {
  items: QueueItem[];
  totalDue: number;
  overdueCount: number;
  criticalCount: number;
  cramMode: boolean;
  onToggleCram: () => void;
  isLoading?: boolean;
}

export function ReviewQueue({
  items,
  totalDue,
  overdueCount,
  criticalCount,
  cramMode,
  onToggleCram,
  isLoading,
}: ReviewQueueProps) {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, 10);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-muted-foreground" />
            Review Queue
          </h3>
          <p className="text-sm text-muted-foreground">
            {totalDue} item{totalDue !== 1 ? "s" : ""} due
            {overdueCount > 0 && (
              <span className="text-orange-500">
                {" "}— {overdueCount} overdue
                {criticalCount > 0 && ` (${criticalCount} critical)`}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={cramMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleCram}
            className="gap-1.5"
          >
            <Zap className={cn("h-4 w-4", cramMode && "animate-pulse")} />
            {cramMode ? "Cram Mode On" : "Cram Mode"}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No problems due for review. Keep up the great work.</p>
        </div>
      )}

      {/* Queue Items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={item.topicSlug ? `/review/${item.topicSlug}` : `/study`}
              className="block"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">
                      {item.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {item.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{item.topicName}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className={cn(item.urgencyLabel.color)}>
                        {item.urgencyLabel.label}
                      </span>
                    </span>
                    <span className="text-muted-foreground/60">
                      EF: {item.easeFactor.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <div className="text-sm font-semibold tabular-nums">
                    {item.priorityScore}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    priority
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Show more / less */}
      {items.length > 10 && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : `Show all ${items.length} items`}
          </Button>
        </div>
      )}
    </div>
  );
}
