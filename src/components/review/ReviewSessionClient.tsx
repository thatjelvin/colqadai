"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingTutorHelp } from "@/components/FloatingTutorHelp";
import { calculateMasteryPercent } from "@/lib/review-metrics";

export type ReviewDifficulty = "beginner" | "intermediate" | "advanced";
export type ReviewRating = "got_it" | "almost" | "didnt_get_it";
export type BriefingDetails = {
  parentTopicName: string;
  lastReviewedLabel: string;
  lastSessionRatings: {
    got_it: number;
    almost: number;
    didnt_get_it: number;
  } | null;
  warmupMessage: string;
  struggledDifficulty: ReviewDifficulty | null;
};

export type ReviewQuestion = {
  id: string;
  difficulty: ReviewDifficulty;
  question: string;
  solution: string;
  hint: string | null;
  source: string | null;
};

type ReviewSessionClientProps = {
  topicSlug: string;
  topicName: string;
  questions: ReviewQuestion[];
  briefing: BriefingDetails;
  backHref: string;
};

type RatingsCount = {
  got_it: number;
  almost: number;
  didnt_get_it: number;
};

const initialRatingsCount: RatingsCount = {
  got_it: 0,
  almost: 0,
  didnt_get_it: 0,
};

export function ReviewSessionClient({ topicSlug, topicName, questions, briefing, backHref }: ReviewSessionClientProps) {
  const [phase, setPhase] = useState<"main" | "round2">("main");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [hasAttemptedQuestion, setHasAttemptedQuestion] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [ratingsByQuestionId, setRatingsByQuestionId] = useState<Record<string, ReviewRating>>({});
  const [roundTwoQuestionIds, setRoundTwoQuestionIds] = useState<string[]>([]);

  const activeQuestionIds = phase === "main" ? questions.map((question) => question.id) : roundTwoQuestionIds;
  const activeQuestionId = activeQuestionIds[currentIndex];
  const currentQuestion = questions.find((question) => question.id === activeQuestionId) ?? null;

  const ratingsCount = useMemo(() => {
    return Object.values(ratingsByQuestionId).reduce<RatingsCount>((acc, rating) => {
      acc[rating] += 1;
      return acc;
    }, { ...initialRatingsCount });
  }, [ratingsByQuestionId]);

  const totalsByDifficulty = useMemo(() => {
    return questions.reduce<Record<ReviewDifficulty, number>>(
      (acc, question) => {
        acc[question.difficulty] += 1;
        return acc;
      },
      {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      }
    );
  }, [questions]);

  const scoreByDifficulty = useMemo(() => {
    const totals: Record<ReviewDifficulty, { got_it: number; almost: number; total: number }> = {
      beginner: { got_it: 0, almost: 0, total: 0 },
      intermediate: { got_it: 0, almost: 0, total: 0 },
      advanced: { got_it: 0, almost: 0, total: 0 },
    };

    questions.forEach((question) => {
      const rating = ratingsByQuestionId[question.id];
      if (!rating) return;
      totals[question.difficulty].total += 1;
      if (rating === "got_it") totals[question.difficulty].got_it += 1;
      if (rating === "almost") totals[question.difficulty].almost += 1;
    });

    return totals;
  }, [questions, ratingsByQuestionId]);

  const overallScore = calculateMasteryPercent(
    ratingsCount.got_it,
    ratingsCount.almost,
    ratingsCount.got_it + ratingsCount.almost + ratingsCount.didnt_get_it
  );

  const isRoundTwo = phase === "round2";
  const isLastQuestionInRound = currentIndex >= activeQuestionIds.length - 1;

  async function submitSessionCompletion(finalRatingsByQuestion: Record<string, ReviewRating>) {
    const finalCounts = Object.values(finalRatingsByQuestion).reduce<RatingsCount>(
      (acc, item) => {
        acc[item] += 1;
        return acc;
      },
      { ...initialRatingsCount }
    );

    const completeResponse = await fetch("/api/review/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicSlug,
        ratings: finalCounts,
      }),
    });

    if (!completeResponse.ok) {
      throw new Error(`Failed to complete review session (${completeResponse.status})`);
    }

    setSessionComplete(true);
  }

  function advanceQuestion(nextRoundTwoQuestionIds: string[]) {
    if (!isLastQuestionInRound) {
      setCurrentIndex((prev) => prev + 1);
      setShowHint(false);
      setShowSolution(false);
      setHasAttemptedQuestion(false);
      return;
    }

    if (!isRoundTwo && nextRoundTwoQuestionIds.length > 0) {
      setPhase("round2");
      setCurrentIndex(0);
      setShowHint(false);
      setShowSolution(false);
      setHasAttemptedQuestion(false);
      return;
    }

    submitSessionCompletion({ ...ratingsByQuestionId }).catch((error) => {
      console.error(error);
      const message = error instanceof Error ? error.message : "Could not complete your review session.";
      setSessionError(message);
    });
  }

  async function saveRating(question: ReviewQuestion, rating: ReviewRating) {
    const response = await fetch("/api/review/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId: question.id,
        topicSlug,
        rating,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save review response (${response.status})`);
    }
  }

  async function handleRate(rating: ReviewRating) {
    if (!currentQuestion || submittingRating) {
      return;
    }

    setSubmittingRating(true);
    setSessionError(null);

    try {
      await saveRating(currentQuestion, rating);

      const nextRatingsByQuestion = {
        ...ratingsByQuestionId,
        [currentQuestion.id]: rating,
      };
      setRatingsByQuestionId(nextRatingsByQuestion);

      if (!isLastQuestionInRound) {
        setCurrentIndex((prev) => prev + 1);
        setShowHint(false);
        setShowSolution(false);
        setHasAttemptedQuestion(false);
      } else if (!isRoundTwo && roundTwoQuestionIds.length > 0) {
        setPhase("round2");
        setCurrentIndex(0);
        setShowHint(false);
        setShowSolution(false);
        setHasAttemptedQuestion(false);
      } else {
        await submitSessionCompletion(nextRatingsByQuestion);
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Could not save your rating. Please try again.";
      setSessionError(message);
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleSkip() {
    if (!currentQuestion || submittingRating) {
      return;
    }

    if (!isRoundTwo) {
      const nextRoundTwoQuestionIds = roundTwoQuestionIds.includes(currentQuestion.id)
        ? roundTwoQuestionIds
        : [...roundTwoQuestionIds, currentQuestion.id];
      setRoundTwoQuestionIds(nextRoundTwoQuestionIds);
      advanceQuestion(nextRoundTwoQuestionIds);
      return;
    }

    setSubmittingRating(true);
    setSessionError(null);
    try {
      await saveRating(currentQuestion, "didnt_get_it");
      const nextRatingsByQuestion = {
        ...ratingsByQuestionId,
        [currentQuestion.id]: "didnt_get_it" as const,
      };
      setRatingsByQuestionId(nextRatingsByQuestion);

      if (!isLastQuestionInRound) {
        setCurrentIndex((prev) => prev + 1);
        setShowHint(false);
        setShowSolution(false);
        setHasAttemptedQuestion(false);
      } else {
        await submitSessionCompletion(nextRatingsByQuestion);
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Could not process skip. Please try again.";
      setSessionError(message);
    } finally {
      setSubmittingRating(false);
    }
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No review questions available</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!hasStarted) {
    return (
      <div className="space-y-6">
        <div>
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="gap-1 px-0">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{topicName}</CardTitle>
            <p className="text-sm text-muted-foreground">{briefing.parentTopicName}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>{briefing.lastReviewedLabel}</p>
            {briefing.lastSessionRatings ? (
              <p>
                Last session: {briefing.lastSessionRatings.got_it} got it, {briefing.lastSessionRatings.almost} almost,{" "}
                {briefing.lastSessionRatings.didnt_get_it} didn&apos;t get it
              </p>
            ) : null}
            {briefing.struggledDifficulty ? (
              <p>
                Struggled most at: <span className="capitalize">{briefing.struggledDifficulty}</span>
              </p>
            ) : null}
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-sm">{briefing.warmupMessage}</p>
            </div>
            <p className="text-muted-foreground">
              {totalsByDifficulty.beginner} beginner · {totalsByDifficulty.intermediate} intermediate · {totalsByDifficulty.advanced} advanced
            </p>
            <Button onClick={() => setHasStarted(true)} className="w-full sm:w-auto">
              Start Practice
            </Button>
          </CardContent>
        </Card>
        <FloatingTutorHelp currentTopicName={topicName} />
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="space-y-6">
        <div>
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="gap-1 px-0">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Session complete for {topicName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-2xl font-bold">You scored {overallScore}%</p>
            <p>
              Beginner: {calculateMasteryPercent(scoreByDifficulty.beginner.got_it, scoreByDifficulty.beginner.almost, totalsByDifficulty.beginner)}%
            </p>
            <p>
              Intermediate: {calculateMasteryPercent(scoreByDifficulty.intermediate.got_it, scoreByDifficulty.intermediate.almost, totalsByDifficulty.intermediate)}%
            </p>
            <p>
              Advanced: {calculateMasteryPercent(scoreByDifficulty.advanced.got_it, scoreByDifficulty.advanced.almost, totalsByDifficulty.advanced)}%
            </p>
            <p className="pt-2 text-muted-foreground">
              Ratings: Got it ({ratingsCount.got_it}), Almost ({ratingsCount.almost}), Didn&apos;t get it ({ratingsCount.didnt_get_it})
            </p>
          </CardContent>
        </Card>
        <FloatingTutorHelp currentTopicName={topicName} />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading question...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isRoundTwo ? "Skipped Questions — Round 2" : `${topicName} Review`} — Question {currentIndex + 1} of {activeQuestionIds.length}
          </CardTitle>
          <p className="text-sm capitalize text-muted-foreground">{currentQuestion.difficulty}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {sessionError}
            </div>
          ) : null}
          <div className="rounded-md border bg-background p-4">
            <MathRenderer content={currentQuestion.question} className="text-sm sm:text-base" />
          </div>

          {currentQuestion.source ? (
            <p className="text-xs text-muted-foreground">Source: {currentQuestion.source}</p>
          ) : null}

          {!showHint ? (
            <Button type="button" variant="outline" onClick={() => setShowHint(true)}>
              Reveal Hint
            </Button>
          ) : (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold">Hint</p>
              <MathRenderer content={currentQuestion.hint ?? "No hint provided."} className="text-sm" />
            </div>
          )}

          <Button type="button" variant="ghost" className="px-0 text-sm" onClick={handleSkip} disabled={submittingRating}>
            Skip for now →
          </Button>

          {!showSolution ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant={hasAttemptedQuestion ? "secondary" : "outline"}
                onClick={() => setHasAttemptedQuestion(true)}
                aria-pressed={hasAttemptedQuestion}
              >
                {hasAttemptedQuestion ? "Attempt recorded" : "I've attempted this"}
              </Button>
              <Button
                type="button"
                onClick={() => setShowSolution(true)}
                disabled={!hasAttemptedQuestion}
                aria-describedby="solution-gate-help"
              >
                Reveal Solution
              </Button>
              <p id="solution-gate-help" className="text-xs text-muted-foreground">
                Try solving first to strengthen retrieval before checking the solution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-blue-300 bg-blue-50 p-4">
                <p className="mb-2 text-sm font-semibold">Solution</p>
                <MathRenderer content={currentQuestion.solution} className="text-sm" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">How did it go?</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={submittingRating} onClick={() => handleRate("got_it")}>
                    Got it
                  </Button>
                  <Button type="button" variant="secondary" disabled={submittingRating} onClick={() => handleRate("almost")}>
                    Almost
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={submittingRating}
                    onClick={() => handleRate("didnt_get_it")}
                  >
                    Didn&apos;t get it
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <FloatingTutorHelp currentTopicName={topicName} />
    </div>
  );
}
