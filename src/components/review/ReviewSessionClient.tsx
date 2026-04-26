"use client";

import { useMemo, useState } from "react";
import { MathRenderer } from "@/components/MathRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingTutorHelp } from "@/components/FloatingTutorHelp";

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

export function ReviewSessionClient({ topicSlug, topicName, questions, briefing }: ReviewSessionClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [ratingsByQuestionId, setRatingsByQuestionId] = useState<Record<string, ReviewRating>>({});

  const currentQuestion = questions[currentIndex];

  const ratingsCount = useMemo(() => {
    return Object.values(ratingsByQuestionId).reduce<RatingsCount>((acc, rating) => {
      acc[rating] += 1;
      return acc;
    }, { ...initialRatingsCount });
  }, [ratingsByQuestionId]);

  const gotItByDifficulty = useMemo(() => {
    return questions.reduce<Record<ReviewDifficulty, number>>(
      (acc, question) => {
        const rating = ratingsByQuestionId[question.id];
        if (rating === "got_it") {
          acc[question.difficulty] += 1;
        }
        return acc;
      },
      {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      }
    );
  }, [questions, ratingsByQuestionId]);

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

  const isLastQuestion = currentIndex >= questions.length - 1;

  async function handleRate(rating: ReviewRating) {
    if (!currentQuestion || submittingRating) {
      return;
    }

    setSubmittingRating(true);

    try {
      const response = await fetch("/api/review/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          topicSlug,
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save review response");
      }

      const nextRatingsByQuestion = {
        ...ratingsByQuestionId,
        [currentQuestion.id]: rating,
      };
      setRatingsByQuestionId(nextRatingsByQuestion);

      if (isLastQuestion) {
        const finalCounts = Object.values(nextRatingsByQuestion).reduce<RatingsCount>(
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
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setShowHint(false);
      setShowSolution(false);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Could not save your rating. Please try again.";
      alert(message);
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
    const totalsByDifficulty = questions.reduce<Record<ReviewDifficulty, number>>(
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

    return (
      <div className="space-y-6">
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
              {totalsByDifficulty.beginner} beginner · {totalsByDifficulty.intermediate} intermediate ·{" "}
              {totalsByDifficulty.advanced} advanced
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
        <Card>
          <CardHeader>
            <CardTitle>Session complete for {topicName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Beginner: {gotItByDifficulty.beginner} / {totalsByDifficulty.beginner} got it</p>
            <p>Intermediate: {gotItByDifficulty.intermediate} / {totalsByDifficulty.intermediate} got it</p>
            <p>Advanced: {gotItByDifficulty.advanced} / {totalsByDifficulty.advanced} got it</p>
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
            {topicName} Review — Question {currentIndex + 1} of {questions.length}
          </CardTitle>
          <p className="text-sm capitalize text-muted-foreground">{currentQuestion.difficulty}</p>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {!showSolution ? (
            <Button type="button" onClick={() => setShowSolution(true)}>
              Reveal Solution
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-blue-300 bg-blue-50 p-4">
                <p className="mb-2 text-sm font-semibold">Solution</p>
                <MathRenderer content={currentQuestion.solution} className="text-sm" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">How did it go?</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={submittingRating}
                    onClick={() => handleRate("got_it")}
                  >
                    Got it
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submittingRating}
                    onClick={() => handleRate("almost")}
                  >
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
