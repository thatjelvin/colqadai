"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MathRenderer } from "@/components/MathRenderer";
import { ArrowLeft, ChevronRight, Eye, Lightbulb, Sparkles, Trophy } from "lucide-react";
import {
  BEGINNER_RATING_LABELS,
  BEGINNER_RATING_VALUES,
  MASTERY_RATING_LABELS,
  MASTERY_RATING_VALUES,
  type ReviewMode,
} from "@/lib/learning/reviewMode";

export interface SessionProblem {
  id: string;
  title: string;
  body: string;
  solution: string;
  difficulty: string;
}

interface ReviewSessionClientProps {
  parentTopicDisplayName: string;
  subtopicDisplayName: string;
  subtopicSlug: string;
  mode: ReviewMode;
  sessionCount: number;
  masteryPercentage: number;
  problems: SessionProblem[];
}

interface SummaryState {
  ratings: { problemId: string; rating: number }[];
  problemsAttempted: number;
  averageRating: number | null;
  transitioned: boolean;
  previousMode: ReviewMode | null;
  newMode: ReviewMode;
  sessionCount: number;
}

const difficultyColor: Record<string, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

const ratingButtonsForMode = (mode: ReviewMode) =>
  mode === "beginner" ? BEGINNER_RATING_VALUES : MASTERY_RATING_VALUES;

const ratingLabelFor = (mode: ReviewMode, value: number) =>
  mode === "beginner"
    ? (BEGINNER_RATING_LABELS as Record<number, string>)[value] ?? `${value}`
    : (MASTERY_RATING_LABELS as Record<number, string>)[value] ?? `${value}`;

export function ReviewSessionClient({
  parentTopicDisplayName,
  subtopicDisplayName,
  subtopicSlug,
  mode,
  sessionCount,
  masteryPercentage,
  problems,
}: ReviewSessionClientProps) {
  const [index, setIndex] = useState(0);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [ratings, setRatings] = useState<{ problemId: string; rating: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const current = problems[index];
  const total = problems.length;
  const progressPct = total === 0 ? 0 : Math.round(((index + (summary ? 0 : 0)) / total) * 100);

  const hintText = useMemo(() => {
    if (!current) return "";
    const solution = current.solution;
    const firstSentence = solution.split(/[.\n]/)[0]?.trim() ?? "";
    return firstSentence.length > 0 ? `${firstSentence}.` : "Try to recall the key idea before checking the solution.";
  }, [current]);

  if (total === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-8">
        <Link
          href="/explore"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Explore
        </Link>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>No problems to review yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              We couldn&apos;t find any problems for <strong>{subtopicDisplayName}</strong> at
              this difficulty. Open the topic summary to generate them.
            </p>
            <Link
              href={`/explore/${subtopicSlug}`}
              className="inline-flex items-center text-primary hover:underline"
            >
              Open topic summary <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summary) {
    return (
      <SessionSummary
        parentTopicDisplayName={parentTopicDisplayName}
        subtopicDisplayName={subtopicDisplayName}
        subtopicSlug={subtopicSlug}
        mode={mode}
        summary={summary}
        total={total}
      />
    );
  }

  if (!current) {
    return null;
  }

  const submitRating = async (rating: number) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/problems/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) {
        throw new Error("Failed to record rating");
      }
    } catch (err) {
      console.warn("Failed to record rating", err);
      setSubmitError("Couldn't save this rating. Your progress may not be updated.");
    } finally {
      const nextRatings = [...ratings, { problemId: current.id, rating }];
      setRatings(nextRatings);
      setHintRevealed(false);
      setSolutionRevealed(false);
      if (index + 1 < total) {
        setIndex(index + 1);
        setSubmitting(false);
      } else {
        await finishSession(nextRatings);
      }
    }
  };

  const finishSession = async (allRatings: { problemId: string; rating: number }[]) => {
    const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
    const average = allRatings.length > 0 ? sum / allRatings.length : null;
    try {
      const res = await fetch("/api/review/session-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: subtopicSlug,
          mode,
          problemsAttempted: allRatings.length,
          averageRating: average,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to record session");
      }
      const data = await res.json();
      setSummary({
        ratings: allRatings,
        problemsAttempted: allRatings.length,
        averageRating: average,
        transitioned: Boolean(data.transitioned),
        previousMode: data.previousMode ?? null,
        newMode: data.newMode ?? mode,
        sessionCount: data.sessionCount ?? sessionCount + 1,
      });
    } catch (err) {
      console.warn("Failed to record session", err);
      setSummary({
        ratings: allRatings,
        problemsAttempted: allRatings.length,
        averageRating: average,
        transitioned: false,
        previousMode: null,
        newMode: mode,
        sessionCount: sessionCount + 1,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ratingValues = ratingButtonsForMode(mode);

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-4 space-y-2">
        <Link
          href="/explore"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Explore / {parentTopicDisplayName}
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {subtopicDisplayName}
          </h1>
          <Badge variant={mode === "beginner" ? "secondary" : "default"}>
            {mode === "beginner" ? "Beginner mode" : "Mastery mode"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Question {index + 1} of {total} · {sessionCount} session{sessionCount === 1 ? "" : "s"} so far
        </p>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">{current.title}</CardTitle>
            <Badge variant={difficultyColor[current.difficulty] ?? "default"}>
              {current.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm sm:text-base">
            <MathRenderer content={current.body} />
          </div>

          {mode === "beginner" && !solutionRevealed && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHintRevealed((prev) => !prev)}
                aria-expanded={hintRevealed}
              >
                <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                {hintRevealed ? "Hide hint" : "Show hint"}
              </Button>
              {hintRevealed && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-foreground/90">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warning">Hint</p>
                  <p className="mt-1">{hintText}</p>
                </div>
              )}
            </div>
          )}

          {!solutionRevealed ? (
            <Button onClick={() => setSolutionRevealed(true)} className="w-full sm:w-auto">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Reveal solution
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-card p-4 text-sm sm:text-base">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Solution
                </p>
                <MathRenderer content={current.solution} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">
                  How well did you know this?
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  {mode === "beginner"
                    ? "Beginner mode uses a forgiving 0–3 scale."
                    : "Mastery mode uses the full 0–5 scale."}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ratingValues.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      onClick={() => submitRating(value)}
                      disabled={submitting}
                      className="h-auto flex-col py-3"
                    >
                      <span className="text-sm font-semibold">{ratingLabelFor(mode, value)}</span>
                      <span className="text-xs text-muted-foreground">{value}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-xs text-destructive">{submitError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionSummary({
  parentTopicDisplayName,
  subtopicDisplayName,
  subtopicSlug,
  mode,
  summary,
  total,
}: {
  parentTopicDisplayName: string;
  subtopicDisplayName: string;
  subtopicSlug: string;
  mode: ReviewMode;
  summary: SummaryState;
  total: number;
}) {
  const averageRounded =
    summary.averageRating !== null ? summary.averageRating.toFixed(1) : "—";
  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-8">
      <div className="mb-4 space-y-2">
        <Link
          href="/explore"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Explore / {parentTopicDisplayName}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {subtopicDisplayName} · Session complete
        </h1>
      </div>

      {summary.transitioned && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              You&apos;re ready for deeper practice
            </p>
            <p className="text-sm text-muted-foreground">
              You graduated from beginner to mastery mode for this topic. Your next session will
              use the full 0–5 rating scale and a mix of difficulties.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-secondary" />
            Session summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Problems" value={`${summary.problemsAttempted}/${total}`} />
            <Stat label="Average rating" value={`${averageRounded} / 5`} />
            <Stat label="Total sessions" value={`${summary.sessionCount}`} />
          </div>
          <p className="text-sm text-muted-foreground">
            You completed this {mode === "beginner" ? "beginner" : "mastery"} session for{" "}
            <strong>{subtopicDisplayName}</strong>. Your mastery for this topic will be
            recalculated from your ratings.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/explore/${subtopicSlug}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to summary
              </Button>
            </Link>
            <Link href="/study">
              <Button>
                Continue to spaced repetition
                <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
