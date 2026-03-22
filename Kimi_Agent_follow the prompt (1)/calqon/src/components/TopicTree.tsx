"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";

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

  return (
    <div className="border-l-2 border-border ml-2">
      <div
        className={`flex items-center gap-2 py-2 px-3 hover:bg-accent rounded-md cursor-pointer ${
          depth === 0 ? "font-semibold" : ""
        }`}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-6" />}

        <BookOpen className="h-4 w-4 text-muted-foreground" />

        <Link href={`/app/topics/${topic.slug}`} className="flex-1">
          <span className="hover:underline">{topic.name}</span>
        </Link>

        {topic.progress && topic.progress.total > 0 && (
          <div className="flex items-center gap-2 w-32">
            <Progress value={topic.progress.percentage} className="h-2" />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {topic.progress.percentage}%
            </span>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
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
    <div className="space-y-1">
      {topics.map((topic) => (
        <TopicItem key={topic.id} topic={topic} />
      ))}
    </div>
  );
}
