"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Trophy,
} from "lucide-react";

interface TopicProgress {
  mastered: number;
  total: number;
  percentage: number;
}

interface TopicNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: TopicNode[];
  progress?: TopicProgress;
}

interface NextTopic {
  slug: string;
  name: string;
  reason: string;
}

interface MasteryTreeProps {
  topics: TopicNode[];
  nextTopic?: NextTopic | null;
}

function MasteryBadge({ percentage }: { percentage: number }) {
  if (percentage >= 100) {
    return (
      <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Mastered
      </Badge>
    );
  }
  if (percentage >= 70) {
    return <Badge variant="secondary">{percentage.toFixed(0)}%</Badge>;
  }
  if (percentage > 0) {
    return <Badge variant="outline">{percentage.toFixed(0)}%</Badge>;
  }
  return null;
}

function MasteredCelebration() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      <div className="absolute top-0 right-0 animate-ping-slow">
        <Sparkles className="h-5 w-5 text-emerald-400" />
      </div>
    </div>
  );
}

function TopicNodeItem({
  topic,
  depth = 0,
  isLastChild = false,
}: {
  topic: TopicNode;
  depth?: number;
  isLastChild?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const hasChildren = topic.children.length > 0;
  const isMastered = topic.progress ? topic.progress.percentage >= 100 : false;
  const isStarted = topic.progress ? topic.progress.percentage > 0 : false;

  if (depth === 0) {
    return (
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-500",
          isMastered && "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10"
        )}
      >
        {isMastered && <MasteredCelebration />}
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {hasChildren ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 w-6 p-0 shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <span className="w-6 shrink-0" />
                )}
                {isMastered && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                <Link href={`/topics/${topic.slug}`}>
                  <CardTitle className={cn("hover:underline cursor-pointer", isMastered && "text-emerald-700 dark:text-emerald-300")}>
                    {topic.name}
                  </CardTitle>
                </Link>
                <MasteryBadge percentage={topic.progress?.percentage ?? 0} />
              </div>
              {topic.description && (
                <CardDescription className={depth > 0 ? "" : "ml-9"}>
                  {topic.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {topic.progress && topic.progress.total > 0 && (
            <div className={cn("space-y-1", depth > 0 ? "" : "ml-9")}>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{topic.progress.mastered}/{topic.progress.total} mastered</span>
                <span className="font-medium">{topic.progress.percentage.toFixed(0)}%</span>
              </div>
              <Progress
                value={topic.progress.percentage}
                className={cn(
                  "h-2 transition-all duration-700",
                  isMastered && "bg-emerald-200 dark:bg-emerald-900 [&>div]:bg-emerald-500"
                )}
              />
            </div>
          )}

          {hasChildren && isExpanded && (
            <div className={cn("mt-4 space-y-2", depth > 0 ? "" : "ml-9")}>
              {topic.children.map((child, idx) => (
                <TopicNodeItem
                  key={child.id}
                  topic={child}
                  depth={depth + 1}
                  isLastChild={idx === topic.children.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const childIsMastered = child.progress?.percentage >= 100;
  return (
    <div className="relative">
      {/* Connector line */}
      {!isLastChild && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
      )}
      <Link href={`/topics/${topic.slug}`} className="block">
        <div
          className={cn(
            "relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 hover:bg-accent/50",
            childIsMastered && "border-emerald-300 dark:border-emerald-700 bg-emerald-50/20 dark:bg-emerald-900/5"
          )}
        >
          {childIsMastered && <MasteredCelebration />}
          <div className="flex items-center gap-2 shrink-0">
            {childIsMastered ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : isStarted ? (
              <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                <div
                  className="h-2 w-2 rounded-full bg-primary"
                  style={{ opacity: Math.max(0.3, (topic.progress?.percentage ?? 0) / 100) }}
                />
              </div>
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  childIsMastered && "text-emerald-700 dark:text-emerald-300"
                )}
              >
                {topic.name}
              </span>
              <MasteryBadge percentage={topic.progress?.percentage ?? 0} />
            </div>
            {topic.progress && topic.progress.total > 0 && (
              <Progress
                value={topic.progress.percentage}
                className="h-1 mt-1 max-w-[200px]"
              />
            )}
          </div>
          {!hasChildren && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </Link>
    </div>
  );
}

export function MasteryTree({ topics, nextTopic }: MasteryTreeProps) {
  const [justMastered, setJustMastered] = useState<string | null>(null);

  // Detect newly mastered topics on mount
  useEffect(() => {
    const newly = topics.find(
      (t) => t.progress && t.progress.percentage >= 100 && t.progress.mastered > 0
    );
    if (newly) {
      setJustMastered(newly.slug);
      const timer = setTimeout(() => setJustMastered(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [topics]);

  return (
    <div className="space-y-6">
      {/* Next recommended topic */}
      {nextTopic && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Next Recommended Topic
                  </p>
                  <Link href={`/topics/${nextTopic.slug}`}>
                    <p className="text-base font-semibold hover:underline cursor-pointer">
                      {nextTopic.name}
                    </p>
                  </Link>
                  <p className="text-xs text-muted-foreground">{nextTopic.reason}</p>
                </div>
              </div>
              <Link href={`/review/${nextTopic.slug}`}>
                <Button size="sm" className="shrink-0 gap-1">
                  <Trophy className="h-4 w-4" />
                  Start
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mastery celebration */}
      {justMastered && (
        <div className="text-center py-4 animate-fade-in">
          <Sparkles className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Topic mastered! You&apos;ve completed all problems in this area.
          </p>
        </div>
      )}

      {/* Topic tree */}
      <div className="space-y-4">
        {topics.map((topic) => (
          <TopicNodeItem key={topic.id} topic={topic} />
        ))}
      </div>
    </div>
  );
}
