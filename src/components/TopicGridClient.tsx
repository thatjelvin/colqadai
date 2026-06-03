"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TopicGridItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subtopicCount: number;
  totalProblems: number;
  masteryPercentage: number;
  attempted: boolean;
  band: "none" | "novice" | "developing" | "proficient" | "mastered";
};

const ACCENT_BY_SLUG: Record<string, { tint: string; border: string; chip: string }> = {
  calculus: { tint: "bg-amber-100/40 dark:bg-amber-900/10", border: "border-amber-300/60 dark:border-amber-700/40", chip: "bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  "linear-algebra": { tint: "bg-stone-200/50 dark:bg-stone-800/30", border: "border-stone-400/60 dark:border-stone-600/40", chip: "bg-stone-300 text-stone-900 dark:bg-stone-700 dark:text-stone-100" },
  "statistics-probability": { tint: "bg-orange-100/40 dark:bg-orange-900/10", border: "border-orange-300/60 dark:border-orange-700/40", chip: "bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100" },
  "discrete-mathematics": { tint: "bg-yellow-100/40 dark:bg-yellow-900/10", border: "border-yellow-300/60 dark:border-yellow-700/40", chip: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100" },
  "differential-equations": { tint: "bg-rose-100/40 dark:bg-rose-900/10", border: "border-rose-300/60 dark:border-rose-700/40", chip: "bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100" },
  "real-analysis": { tint: "bg-slate-200/50 dark:bg-slate-800/30", border: "border-slate-400/60 dark:border-slate-600/40", chip: "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100" },
  "numerical-methods": { tint: "bg-lime-100/40 dark:bg-lime-900/10", border: "border-lime-300/60 dark:border-lime-700/40", chip: "bg-lime-200 text-lime-900 dark:bg-lime-900/40 dark:text-lime-100" },
  optimization: { tint: "bg-emerald-100/40 dark:bg-emerald-900/10", border: "border-emerald-300/60 dark:border-emerald-700/40", chip: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
  "financial-mathematics": { tint: "bg-teal-100/40 dark:bg-teal-900/10", border: "border-teal-300/60 dark:border-teal-700/40", chip: "bg-teal-200 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100" },
  econometrics: { tint: "bg-cyan-100/40 dark:bg-cyan-900/10", border: "border-cyan-300/60 dark:border-cyan-700/40", chip: "bg-cyan-200 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100" },
  "ml-mathematics": { tint: "bg-violet-100/40 dark:bg-violet-900/10", border: "border-violet-300/60 dark:border-violet-700/40", chip: "bg-violet-200 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100" },
  "abstract-algebra": { tint: "bg-fuchsia-100/40 dark:bg-fuchsia-900/10", border: "border-fuchsia-300/60 dark:border-fuchsia-700/40", chip: "bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:text-fuchsia-100" },
  "information-theory": { tint: "bg-indigo-100/40 dark:bg-indigo-900/10", border: "border-indigo-300/60 dark:border-indigo-700/40", chip: "bg-indigo-200 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100" },
};

const DEFAULT_ACCENT = { tint: "bg-muted/40", border: "border-border", chip: "bg-muted text-muted-foreground" };

const BAND_LABEL: Record<TopicGridItem["band"], string> = {
  none: "Not started",
  novice: "Novice",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};

const BAND_COLOR: Record<TopicGridItem["band"], string> = {
  none: "text-muted-foreground",
  novice: "text-secondary",
  developing: "text-secondary",
  proficient: "text-primary",
  mastered: "text-success",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSubsequence(needle: string, haystack: string) {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (needle[i] === haystack[j]) i += 1;
  }
  return i === needle.length;
}

function fuzzyMatch(query: string, candidate: string) {
  const nq = normalize(query);
  if (!nq) return true;
  const nc = normalize(candidate);
  if (nc.includes(nq)) return true;
  return isSubsequence(nq, nc);
}

export function TopicGridClient({ topics }: { topics: TopicGridItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return topics;
    return topics.filter((topic) => fuzzyMatch(query, topic.name));
  }, [query, topics]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any topic..."
          className="h-14 pl-12 text-base rounded-2xl border-2 focus-visible:ring-2"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No topics match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((topic) => {
            const accent = ACCENT_BY_SLUG[topic.slug] ?? DEFAULT_ACCENT;
            return (
              <Link key={topic.id} href={`/topics/${topic.slug}`} className="group block">
                <Card
                  className={cn(
                    "h-full border-2 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
                    accent.tint,
                    accent.border,
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl leading-tight">{topic.name}</CardTitle>
                      <Badge variant="outline" className={cn("shrink-0 text-xs", accent.chip)}>
                        {topic.subtopicCount} {topic.subtopicCount === 1 ? "subtopic" : "subtopics"}
                      </Badge>
                    </div>
                    {topic.description && (
                      <CardDescription className="line-clamp-2 text-sm">
                        {topic.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topic.attempted ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Mastery</span>
                          <span className={cn("font-semibold", BAND_COLOR[topic.band])}>
                            {topic.masteryPercentage}% <span className="text-xs text-muted-foreground">· {BAND_LABEL[topic.band]}</span>
                          </span>
                        </div>
                        <Progress value={topic.masteryPercentage} className="h-1.5" />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {topic.totalProblems} {topic.totalProblems === 1 ? "problem" : "problems"} waiting for you
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
