"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewHeatmap } from "@/components/ReviewHeatmap";
import { ReviewQueue } from "@/components/ReviewQueue";
import { CalendarDays, ListOrdered } from "lucide-react";

type QueueItem = {
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
};

type QueueResponse = {
  items: QueueItem[];
  summary: {
    totalDue: number;
    overdueCount: number;
    criticalCount: number;
    totalByDifficulty: Record<string, number>;
  };
};

interface ReviewDashboardSectionProps {
  reviewDayKeys: string[];
  streak: number;
}

export function ReviewDashboardSection({
  reviewDayKeys,
  streak,
}: ReviewDashboardSectionProps) {
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [cramMode, setCramMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"queue" | "heatmap">("queue");

  const fetchQueue = (cram: boolean) => {
    setLoading(true);
    fetch(`/api/dashboard/review-queue?cram=${cram}`)
      .then((r) => r.json())
      .then((data) => setQueueData(data))
      .catch(() => setQueueData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQueue(cramMode);
  }, [cramMode]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Review Dashboard</CardTitle>
            <CardDescription>
              Track your spaced repetition activity and see what&apos;s due.
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={view === "queue" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("queue")}
            >
              <ListOrdered className="h-4 w-4 mr-1" />
              Queue
            </Button>
            <Button
              variant={view === "heatmap" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("heatmap")}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Heatmap
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-[200px]">
        {view === "queue" ? (
          queueData ? (
            <ReviewQueue
              items={queueData.items}
              totalDue={queueData.summary.totalDue}
              overdueCount={queueData.summary.overdueCount}
              criticalCount={queueData.summary.criticalCount}
              cramMode={cramMode}
              onToggleCram={() => setCramMode((c) => !c)}
              isLoading={loading}
            />
          ) : loading ? (
            <ReviewQueue
              items={[]}
              totalDue={0}
              overdueCount={0}
              criticalCount={0}
              cramMode={cramMode}
              onToggleCram={() => setCramMode((c) => !c)}
              isLoading
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              Start practicing problems to build your review queue.
            </p>
          )
        ) : (
          <ReviewHeatmap
            reviewDays={reviewDayKeys}
            currentStreak={streak}
          />
        )}
      </CardContent>
    </Card>
  );
}
