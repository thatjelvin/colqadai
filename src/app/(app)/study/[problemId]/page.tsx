"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MathRenderer } from "@/components/MathRenderer";
import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Problem {
  id: string;
  title: string;
  body: string;
  solution: string;
  difficulty: string;
  topic: {
    name: string;
    slug: string;
  };
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.problemId as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [userAnswer, setUserAnswer] = useState("");
  const [attemptResult, setAttemptResult] = useState<{
    attemptId: string;
    isCorrect: boolean;
    rationale: string;
    attemptNumber: number;
    errorAnalysis?: { errorType: string; explanation: string } | null;
    elaborationPrompt?: string | null;
  } | null>(null);
  const [selfQuizMode, setSelfQuizMode] = useState(true);
  const [reflectionResponse, setReflectionResponse] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [nextReviewDateText, setNextReviewDateText] = useState<string | null>(null);

  const [workedExampleMode, setWorkedExampleMode] = useState(false);
  const [workedExamplePhase, setWorkedExamplePhase] = useState<"study" | "cover" | "generate">("study");
  const [workedExampleTimer, setWorkedExampleTimer] = useState(0);
  const [workedGenerateAttempt, setWorkedGenerateAttempt] = useState("");
  const [workedMatch, setWorkedMatch] = useState<boolean | null>(null);

  useEffect(() => {
    // Fetch problem details
    const fetchProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${problemId}`);
        if (!response.ok) throw new Error("Failed to fetch problem");
        const data = await response.json();
        setProblem(data);
      } catch (error) {
        console.error("Error fetching problem:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Start the problem (create UserProblem record)
    const startProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${problemId}/start`, {
          method: "POST",
        });
        if (!response.ok) throw new Error("Failed to start problem");
      } catch (error) {
        console.error("Error starting problem:", error);
      }
    };

    fetchProblem();
    startProblem();
  }, [problemId]);

  const handleRating = async (rating: number) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      const response = await fetch(`/api/problems/${problemId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, timeTaken }),
      });

      if (!response.ok) throw new Error("Failed to submit review");
      const reviewData = await response.json();

      if (reviewData?.nextReviewAt) {
        const formatted = new Date(reviewData.nextReviewAt).toLocaleDateString();
        setNextReviewDateText(`Next review scheduled for ${formatted}.`);
      }

      // Navigate to next due problem or dashboard
      const dueResponse = await fetch("/api/problems/due");
      if (dueResponse.ok) {
        const dueProblems = await dueResponse.json();
        if (dueProblems.length > 0 && dueProblems[0].problem.id !== problemId) {
          router.push(`/app/study/${dueProblems[0].problem.id}`);
        } else {
          router.push("/app/dashboard");
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      setIsSubmitting(false);
    }
  };

  const handleSubmitAttempt = async () => {
    if (!userAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/problems/${problemId}/attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer: userAnswer,
          selfQuizMode,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit attempt");

      const data = await response.json();
      setAttemptResult(data);
      setShowSolution(true);
      setReflectionSaved(false);
    } catch (error) {
      console.error("Error submitting attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveReflection = async () => {
    if (!attemptResult?.elaborationPrompt || !reflectionResponse.trim()) return;

    try {
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemId,
          attemptId: attemptResult.attemptId,
          prompt: attemptResult.elaborationPrompt,
          response: reflectionResponse,
        }),
      });

      if (!response.ok) throw new Error("Failed to save reflection");
      setReflectionSaved(true);
    } catch (error) {
      console.error("Error saving reflection:", error);
    }
  };

  const submitWorkedExample = async () => {
    if (workedExampleTimer < 60 || !workedGenerateAttempt.trim() || workedMatch === null) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/problems/${problemId}/worked-example`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyDurationSeconds: workedExampleTimer,
          generateAttempt: workedGenerateAttempt,
          selfAssessedMatch: workedMatch,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit worked example");

      setShowSolution(true);
      setWorkedExampleMode(false);
    } catch (error) {
      console.error("Error submitting worked example:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Problem not found.</p>
        <Link href="/app/topics">
          <Button className="mt-4">Browse Topics</Button>
        </Link>
      </div>
    );
  }

  const difficultyColor: Record<string, "default" | "secondary" | "destructive"> = {
    EASY: "secondary",
    MEDIUM: "default",
    HARD: "destructive",
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (!workedExampleMode || workedExamplePhase !== "study") return;

    const timer = setInterval(() => {
      setWorkedExampleTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [workedExampleMode, workedExamplePhase]);

  return (
    <div className="min-h-screen bg-background -m-6 flex flex-col">
      {/* Practice Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-4">
            <Link href="/topics">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Practice
              </Button>
            </Link>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground w-full sm:w-auto">
              <div className="flex items-center">
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Practice Area */}
      <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Problem Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground hover:underline cursor-pointer">
                    <Link href={`/topics/${problem.topic.slug}`}>
                      {problem.topic.name}
                    </Link>
                  </span>
                  <Badge variant={difficultyColor[problem.difficulty]}>
                    {problem.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{problem.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-6 mb-6">
                  <MathRenderer content={problem.body} />
                </div>

                <div className="mb-6 rounded-lg border p-4 bg-card">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-semibold">Self-Quiz Mode</h3>
                      <p className="text-sm text-muted-foreground">Hide worked guidance until after submission.</p>
                    </div>
                    <Switch checked={selfQuizMode} onCheckedChange={setSelfQuizMode} />
                  </div>
                </div>

                <div className="mb-6 rounded-lg border p-4 bg-card">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-semibold">Worked Example Mode</h3>
                      <p className="text-sm text-muted-foreground">Study for at least 60 seconds, then regenerate from memory.</p>
                    </div>
                    <Switch
                      checked={workedExampleMode}
                      onCheckedChange={(checked) => {
                        setWorkedExampleMode(checked);
                        setWorkedExamplePhase("study");
                        setWorkedExampleTimer(0);
                      }}
                    />
                  </div>

                  {workedExampleMode && (
                    <div className="mt-4 space-y-4">
                      {workedExamplePhase === "study" && (
                        <div className="space-y-3">
                          <p className="text-sm">Phase 1 - Study the full solution for at least 60s.</p>
                          <div className="rounded-lg bg-muted/40 p-4">
                            <MathRenderer content={problem.solution} />
                          </div>
                          <p className="text-sm text-muted-foreground">Study timer: {formatTime(workedExampleTimer)}</p>
                          <Button
                            disabled={workedExampleTimer < 60}
                            onClick={() => setWorkedExamplePhase("cover")}
                          >
                            I've studied this
                          </Button>
                        </div>
                      )}

                      {workedExamplePhase === "cover" && (
                        <div className="space-y-3">
                          <p className="text-sm">Phase 2 - Cover and recall the method, then continue.</p>
                          <Button onClick={() => setWorkedExamplePhase("generate")}>Continue to Generate</Button>
                        </div>
                      )}

                      {workedExamplePhase === "generate" && (
                        <div className="space-y-3">
                          <p className="text-sm">Phase 3 - Solve from memory, then self-assess your match.</p>
                          <textarea
                            className="w-full min-h-[120px] rounded-md border bg-background p-3 text-sm"
                            value={workedGenerateAttempt}
                            onChange={(e) => setWorkedGenerateAttempt(e.target.value)}
                            placeholder="Write your regenerated solution from memory"
                          />
                          <div className="flex gap-2">
                            <Button variant={workedMatch === true ? "default" : "outline"} onClick={() => setWorkedMatch(true)}>
                              Close Match
                            </Button>
                            <Button variant={workedMatch === false ? "default" : "outline"} onClick={() => setWorkedMatch(false)}>
                              Needs Work
                            </Button>
                          </div>
                          <Button onClick={submitWorkedExample} disabled={isSubmitting || workedMatch === null}>
                            Submit Worked Example Session
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!showSolution ? (
                  <div className="space-y-4 mt-6">
                    <h3 className="text-lg font-semibold">Your Attempt</h3>
                    <textarea
                      className="w-full min-h-[140px] rounded-md border bg-background p-3 text-sm"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your solution approach before reveal"
                    />
                    <Button onClick={handleSubmitAttempt} disabled={isSubmitting || !userAnswer.trim()} className="w-full max-w-sm">
                      Submit Attempt to Reveal
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-semibold mb-4">Solution</h3>
                      <div className="prose prose-sm sm:prose max-w-none dark:prose-invert mb-6">
                        <MathRenderer content={problem.solution} />
                      </div>
                    </div>

                    {attemptResult && (
                      <div className="rounded-xl border p-4 bg-card space-y-3">
                        <h3 className="font-semibold">Attempt Feedback</h3>
                        <p className="text-sm">
                          Result: <span className={attemptResult.isCorrect ? "text-green-600" : "text-red-600"}>{attemptResult.isCorrect ? "Correct" : "Incorrect"}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">{attemptResult.rationale}</p>
                        {!attemptResult.isCorrect && attemptResult.errorAnalysis && (
                          <div className="text-sm rounded-md bg-muted p-3">
                            <p className="font-medium">Error type: {attemptResult.errorAnalysis.errorType}</p>
                            <p className="text-muted-foreground">{attemptResult.errorAnalysis.explanation}</p>
                          </div>
                        )}

                        {attemptResult.elaborationPrompt && (
                          <div className="space-y-2">
                            <p className="font-medium">Elaboration prompt</p>
                            <p className="text-sm text-muted-foreground">{attemptResult.elaborationPrompt}</p>
                            <textarea
                              className="w-full min-h-[100px] rounded-md border bg-background p-3 text-sm"
                              value={reflectionResponse}
                              onChange={(e) => setReflectionResponse(e.target.value)}
                              placeholder="Optional: write your reflection"
                            />
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setReflectionResponse("")}>Skip</Button>
                              <Button onClick={handleSaveReflection} disabled={!reflectionResponse.trim() || reflectionSaved}>
                                {reflectionSaved ? "Reflection Saved" : "Save Reflection"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {nextReviewDateText && (
                      <p className="text-sm text-muted-foreground">{nextReviewDateText}</p>
                    )}

                    <div className="bg-muted/30 rounded-xl p-6 text-center mt-8 border">
                      <h3 className="text-lg font-semibold mb-2">How well did you know this?</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Your rating helps schedule future reviews
                      </p>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex-col hover:bg-destructive hover:text-white transition-colors"
                          onClick={() => handleRating(0)}
                          disabled={isSubmitting}
                        >
                          <span className="text-lg mb-1">Again</span>
                          <span className="text-xs opacity-70">Review very soon</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex-col transition-colors"
                          onClick={() => handleRating(1)}
                          disabled={isSubmitting}
                        >
                          <span className="text-lg mb-1">Hard</span>
                          <span className="text-xs text-muted-foreground">Struggled a bit</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex-col transition-colors"
                          onClick={() => handleRating(3)}
                          disabled={isSubmitting}
                        >
                          <span className="text-lg mb-1">Good</span>
                          <span className="text-xs text-muted-foreground">Knew the steps</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-4 flex-col hover:bg-success hover:text-white hover:border-success transition-colors"
                          onClick={() => handleRating(5)}
                          disabled={isSubmitting}
                        >
                          <span className="text-lg mb-1">Easy</span>
                          <span className="text-xs opacity-70">Perfect recall</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Panel Placeholder */}
          <div className="lg:col-span-1 h-[500px] lg:h-auto">
            <ChatInterface problemId={problemId} />
          </div>
        </div>
      </div>
    </div>
  );
}
