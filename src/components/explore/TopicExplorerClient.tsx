"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TopicNode } from "@/lib/topic-taxonomy";

type TopicProgressRecord = {
  reviewCount: number;
  masteryPercent: number;
};

type TopicExplorerClientProps = {
  topics: TopicNode[];
  progressBySlug: Record<string, TopicProgressRecord>;
};

type FilteredTopic = {
  slug: string;
  displayName: string;
  subtopics: TopicNode["subtopics"];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSubsequence(needle: string, haystack: string) {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (needle[i] === haystack[j]) {
      i += 1;
    }
  }
  return i === needle.length;
}

function fuzzyMatch(query: string, candidate: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const normalizedCandidate = normalize(candidate);
  if (normalizedCandidate.includes(normalizedQuery)) {
    return true;
  }

  return isSubsequence(normalizedQuery, normalizedCandidate);
}

function getProgressClass(record?: TopicProgressRecord) {
  if (!record) {
    return "text-red-600";
  }
  if (record.masteryPercent >= 80) {
    return "text-green-600";
  }
  if (record.masteryPercent >= 50) {
    return "text-amber-600";
  }
  return "text-red-600";
}

export function TopicExplorerClient({ topics, progressBySlug }: TopicExplorerClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(topics.map((topic) => [topic.slug, true]))
  );

  const filteredTopics = useMemo<FilteredTopic[]>(() => {
    if (!query.trim()) {
      return topics;
    }

    return topics
      .map((topic) => {
        const topicMatches = fuzzyMatch(query, topic.displayName);
        const matchingSubtopics = topic.subtopics.filter((subtopic) =>
          fuzzyMatch(query, subtopic.displayName)
        );

        if (!topicMatches && matchingSubtopics.length === 0) {
          return null;
        }

        return {
          ...topic,
          subtopics: topicMatches ? topic.subtopics : matchingSubtopics,
        };
      })
      .filter((topic): topic is FilteredTopic => Boolean(topic));
  }, [query, topics]);

  const toggleTopic = (slug: string) => {
    setExpanded((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-6">
      {isNavigating ? (
        <div className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-topic-load rounded-r-full bg-primary" />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics and subtopics..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredTopics.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No topics match your search.
            </CardContent>
          </Card>
        )}

        {filteredTopics.map((topic) => {
          const isExpanded = hasQuery ? true : expanded[topic.slug] ?? true;

          return (
            <Card key={topic.slug}>
              <CardHeader className="pb-3">
                <button
                  type="button"
                  onClick={() => toggleTopic(topic.slug)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <CardTitle className="text-base sm:text-lg">{topic.displayName}</CardTitle>
                  <span className="text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                </button>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <ul className="space-y-2">
                    {topic.subtopics.map((subtopic) => {
                      const progress = progressBySlug[subtopic.slug];
                      const masteryPercent = progress?.masteryPercent ?? 0;

                      return (
                        <li key={subtopic.slug}>
                          <Link
                            href={`/explore/${subtopic.slug}`}
                            onClick={(event) => {
                              event.preventDefault();
                              if (isNavigating) return;
                              setIsNavigating(true);
                              router.push(`/explore/${subtopic.slug}`);
                            }}
                            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                          >
                            <span className="truncate pr-3">{subtopic.displayName}</span>
                            <span className="flex items-center gap-2">
                              <span className={cn("text-xs font-semibold", getProgressClass(progress))}>
                                {masteryPercent}%
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
