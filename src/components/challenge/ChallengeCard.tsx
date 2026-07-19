"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, CheckCircle2, Zap, Loader2 } from "lucide-react";

interface ChallengeCardProps {
  problemBody: string;
  problemId: string;
  alreadyCompleted: boolean;
  onComplete: () => void;
  streakBoosted: boolean;
}

export function ChallengeCard({
  problemBody,
  problemId,
  alreadyCompleted,
  onComplete,
  streakBoosted,
}: ChallengeCardProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; rationale: string } | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || completed) return;
    setSubmitting(true);

    try {
      // Submit answer to grading API
      const res = await fetch(`/api/problems/${problemId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, selfQuizMode: false }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Grading failed" }));
        setFeedback({ isCorrect: false, rationale: err.error || "Failed to grade answer" });
        return;
      }

      const data = await res.json();
      setFeedback({ isCorrect: data.isCorrect, rationale: data.rationale || data.error || "" });

      if (data.isCorrect) {
        // Complete the challenge
        const completeRes = await fetch("/api/challenge/complete", { method: "POST" });
        if (completeRes.ok) {
          setCompleted(true);
          onComplete();
        }
      }
    } catch {
      setFeedback({ isCorrect: false, rationale: "Failed to submit answer. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={completed ? "border-green-300 dark:border-green-700" : "border-orange-200 dark:border-orange-800"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Problem of the Day</CardTitle>
          </div>
          <Badge variant={completed ? "default" : "secondary"} className={completed ? "bg-green-500" : ""}>
            {completed ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> 2x Streak Day
              </span>
            )}
          </Badge>
        </div>
        <CardDescription>
          {completed
            ? "Great job! Come back tomorrow for a new challenge."
            : "Complete today's challenge for a 2x streak boost!"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!completed && (
          <>
            {/* Problem display */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-2">Problem:</p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{problemBody}</div>
            </div>

            {/* Answer input */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                className="w-full min-h-[100px] rounded-md border bg-background p-3 text-sm resize-y"
                placeholder="Type your answer here... Use LaTeX with $...$ for math notation."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={submitting}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !answer.trim()}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Grading...
                    </>
                  ) : (
                    "Submit Answer"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Feedback after submission */}
        {feedback && (
          <div className={`rounded-lg border p-4 ${feedback.isCorrect ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10" : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10"}`}>
            <p className="font-medium text-sm mb-1">
              {feedback.isCorrect ? "✓ Correct!" : "✗ Not quite"}
            </p>
            {feedback.rationale && (
              <p className="text-sm text-muted-foreground">{feedback.rationale}</p>
            )}
          </div>
        )}

        {/* Streak boost notification */}
        {completed && streakBoosted && (
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10 p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Streak Boosted! This counts as 2 streak days.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {!completed && !feedback && (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSolution(!showSolution)}
            className="text-xs text-muted-foreground"
          >
            {showSolution ? "Hide solution" : "I'm stuck, show the solution"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
