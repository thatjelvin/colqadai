"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: Topic[];
  progress?: {
    mastered: number;
    total: number;
    percentage: number;
  };
}

interface TopicTreeProps {
  topics: Topic[];
}

function TopicItem({ topic, depth = 0 }: { topic: Topic; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const hasChildren = topic.children && topic.children.length > 0;

  if (depth === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                {hasChildren ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <span className="w-6" />
                )}
                <Link href={`/app/topics/${topic.slug}`}>
                  <CardTitle className="hover:underline cursor-pointer">
                    {topic.name}
                  </CardTitle>
                </Link>
              </div>
              {topic.description && (
                <CardDescription className="ml-9">{topic.description}</CardDescription>
              )}
            </div>
            {topic.progress && topic.progress.total > 0 && (
              <Badge variant="outline">
                {topic.progress.mastered}/{topic.progress.total} mastered
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {topic.progress && topic.progress.total > 0 && (
            <div className="space-y-2 ml-9">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{topic.progress.percentage.toFixed(0)}%</span>
              </div>
              <Progress value={topic.progress.percentage} />
            </div>
          )}

          {hasChildren && isExpanded && (
            <div className="mt-6 ml-9 space-y-3">
              {topic.children.map((child) => (
                <TopicItem key={child.id} topic={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Link href={`/app/topics/${topic.slug}`} className="block">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsExpanded(!isExpanded);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <h4 className="text-sm font-medium">{topic.name}</h4>
              </div>
              {topic.progress && topic.progress.total > 0 && (
                <span className="text-xs text-muted-foreground">
                  {topic.progress.total} problems
                </span>
              )}
            </div>
            {topic.progress && topic.progress.total > 0 && (
              <div className={hasChildren ? "ml-8" : ""}>
                <Progress value={topic.progress.percentage} className="h-1" />
              </div>
            )}
          </div>
          {!hasChildren && (
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-4" />
          )}
        </div>
      </Link>
      
      {hasChildren && isExpanded && (
        <div className="ml-8 space-y-3 border-l-2 border-border pl-4">
          {topic.children.map((child) => (
            <TopicItem key={child.id} topic={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TopicTree({ topics }: TopicTreeProps) {
  return (
    <div className="space-y-4">
      {topics.map((topic) => (
        <TopicItem key={topic.id} topic={topic} />
      ))}
    </div>
  );
}
